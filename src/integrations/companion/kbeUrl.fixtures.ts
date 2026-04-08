/**
 * Canonical KBE URL encodings for TS tests. Keep aligned with
 * `companion/windows/tests/KbeRequestParserTests.cs` (parse of these URLs
 * must yield the expected Windows paths on the companion side).
 */
export const CREATE_KBE_URL_CASES: ReadonlyArray<{ readonly path: string; readonly url: string }> = [
  { path: 'V:\\Shared\\Chinese Folder', url: 'kbe:V:/Shared/Chinese%20Folder' },
  {
    path: '\\\\server\\share\\Driver_Package\\win_signed',
    url: 'kbe:%2F%2Fserver%2Fshare%2FDriver_Package%2Fwin_signed',
  },
  { path: 'file:///C:/Work/Specs.pdf', url: 'kbe:file:///C:/Work/Specs.pdf' },
];
