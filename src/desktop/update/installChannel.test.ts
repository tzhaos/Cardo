import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isTypicalInstallDirectory } from './installChannelHeuristics';

describe('install channel heuristics', () => {
  it('treats LocalAppData Programs as setup', () => {
    const env = {
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
      ProgramFiles: 'C:\\Program Files',
    };
    assert.equal(
      isTypicalInstallDirectory('C:\\Users\\me\\AppData\\Local\\Programs\\Cardo', env),
      true,
    );
  });

  it('does not treat Downloads as install tree', () => {
    const env = {
      LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
      ProgramFiles: 'C:\\Program Files',
    };
    assert.equal(isTypicalInstallDirectory('D:\\Downloads\\CardoPortable', env), false);
  });
});
