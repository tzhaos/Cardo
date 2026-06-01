export const CREATE_KBE_URL_CASES: ReadonlyArray<{ readonly path: string; readonly url: string }> =
  [
    { path: 'V:\\Shared\\Chinese Folder', url: 'kbe:V:/Shared/Chinese%20Folder' },
    {
      path: '\\\\server\\share\\Driver_Package\\win_signed',
      url: 'kbe:%2F%2Fserver%2Fshare%2FDriver_Package%2Fwin_signed',
    },
    { path: 'file:///C:/Work/Specs.pdf', url: 'kbe:file:///C:/Work/Specs.pdf' },
  ];

export const KBE_PARSE_CASES: ReadonlyArray<{
  readonly url: string;
  readonly expectedWindowsPath: string;
}> = [
  { url: 'kbe:V:/Shared/Chinese%20Folder', expectedWindowsPath: 'V:\\Shared\\Chinese Folder' },
  {
    url: 'kbe:%2F%2Fserver%2Fshare%2FDriver_Package%2Fwin_signed',
    expectedWindowsPath: '\\\\server\\share\\Driver_Package\\win_signed',
  },
  { url: 'kbe:file:///C:/Work/Specs.pdf', expectedWindowsPath: 'C:\\Work\\Specs.pdf' },
  { url: 'kbe://server/share/Docs', expectedWindowsPath: '\\\\server\\share\\Docs' },
  { url: 'kbe:file://server/share/Docs', expectedWindowsPath: '\\\\server\\share\\Docs' },
];
