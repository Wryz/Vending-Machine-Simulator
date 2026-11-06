import ExpoModulesCore
import GameKit

/**
 Coinline's Game Center bridge (GameKit). Deliberately small:
 - `authenticate` installs the GameKit auth handler once and never presents
   Apple's sign-in sheet by itself (SPEC: no forced prompts). If the player
   isn't signed in, the sheet is kept and shown only from `presentSignIn`,
   which the app calls when the player taps "Sign in" in Settings.
 - Scores and achievements are fire-and-forget; they reject when not signed in.
 */
public class GameCenterModule: Module {
  private var signInController: UIViewController?
  private var handlerInstalled = false
  private var handlerFired = false
  private var pendingAuth: [Promise] = []
  private var dashboardDelegate: DashboardDelegate?

  public func definition() -> ModuleDefinition {
    Name("GameCenter")

    Events("onAuthChange")

    Function("isAuthenticated") { () -> Bool in
      GKLocalPlayer.local.isAuthenticated
    }

    AsyncFunction("authenticate") { (promise: Promise) in
      DispatchQueue.main.async {
        if self.handlerInstalled {
          // The handler already ran (or is running): answer with the current state.
          if !self.handlerFired {
            self.pendingAuth.append(promise)
          } else {
            promise.resolve(self.authState())
          }
          return
        }
        self.handlerInstalled = true
        self.pendingAuth.append(promise)
        GKLocalPlayer.local.authenticateHandler = { [weak self] controller, _ in
          guard let self = self else { return }
          self.handlerFired = true
          // Keep the sheet for an explicit "Sign in" tap; never present it here.
          self.signInController = GKLocalPlayer.local.isAuthenticated ? nil : controller
          let state = self.authState()
          let waiting = self.pendingAuth
          self.pendingAuth = []
          waiting.forEach { $0.resolve(state) }
          self.sendEvent("onAuthChange", state)
        }
      }
    }

    AsyncFunction("presentSignIn") { (promise: Promise) in
      DispatchQueue.main.async {
        guard let controller = self.signInController,
              let top = self.appContext?.utilities?.currentViewController() else {
          promise.resolve(false)
          return
        }
        top.present(controller, animated: true)
        promise.resolve(true)
      }
    }

    AsyncFunction("submitScore") { (score: Int, leaderboardIds: [String], promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject("ERR_GC_NOT_AUTHENTICATED", "Game Center player is not signed in")
        return
      }
      GKLeaderboard.submitScore(
        score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: leaderboardIds
      ) { error in
        if let error = error {
          promise.reject("ERR_GC_SCORE", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    AsyncFunction("reportAchievements") { (ids: [String], percents: [Double], promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.reject("ERR_GC_NOT_AUTHENTICATED", "Game Center player is not signed in")
        return
      }
      var achievements: [GKAchievement] = []
      for (i, id) in ids.enumerated() {
        let a = GKAchievement(identifier: id)
        a.percentComplete = i < percents.count ? percents[i] : 100
        // The game already celebrates trophies; avoid a second banner on top.
        a.showsCompletionBanner = false
        achievements.append(a)
      }
      GKAchievement.report(achievements) { error in
        if let error = error {
          promise.reject("ERR_GC_ACHIEVEMENT", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    AsyncFunction("showDashboard") { (leaderboardId: String?, promise: Promise) in
      DispatchQueue.main.async {
        guard GKLocalPlayer.local.isAuthenticated,
              let top = self.appContext?.utilities?.currentViewController() else {
          promise.resolve(false)
          return
        }
        let vc: GKGameCenterViewController
        if let id = leaderboardId, !id.isEmpty {
          vc = GKGameCenterViewController(
            leaderboardID: id, playerScope: .global, timeScope: .allTime)
        } else {
          vc = GKGameCenterViewController(state: .leaderboards)
        }
        let delegate = DashboardDelegate { [weak self] in self?.dashboardDelegate = nil }
        self.dashboardDelegate = delegate
        vc.gameCenterDelegate = delegate
        top.present(vc, animated: true)
        promise.resolve(true)
      }
    }
  }

  private func authState() -> [String: Any] {
    let player = GKLocalPlayer.local
    return [
      "authenticated": player.isAuthenticated,
      "canSignIn": signInController != nil,
      "displayName": player.isAuthenticated ? player.displayName : NSNull(),
    ]
  }
}

private final class DashboardDelegate: NSObject, GKGameCenterControllerDelegate {
  private let onDone: () -> Void
  init(onDone: @escaping () -> Void) { self.onDone = onDone }

  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
    onDone()
  }
}
