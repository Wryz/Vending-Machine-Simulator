declare module 'tz-lookup' {
  /** IANA time zone at a point (timezone-boundary-builder data). */
  export default function tzlookup(lat: number, lng: number): string;
}
