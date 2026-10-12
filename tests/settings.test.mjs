import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers.mjs';

const { SettingsManager } = loadTs('src/features/settings/settings.ts');
const { ThemeManager } = loadTs('src/core/theme/theme-service.ts');
const account = id => ({ id, name:id, appId:'app-' + id, appSecret:'secret-' + id });

test('parallel settings mutations are serialized, including account additions', async () => {
    const saves = [];
    const settings = new SettingsManager({ loadData:async () => null, saveData:async value => { saves.push(structuredClone(value)); } });
    await settings.loadSettings();
    await Promise.all([settings.addAccount(account('a')),settings.addAccount(account('b')),settings.updateSettings({activeThemeId:'orange'})]);
    const value = settings.getSettings();
    assert.deepEqual(value.wechatAccounts.map(a=>a.id), ['a','b']);
    assert.equal(value.activeThemeId, 'orange');
    assert.deepEqual(saves.at(-1), value);
    value.wechatAccounts[0].appSecret = 'mutated';
    assert.equal(settings.getAccount('a').appSecret, 'secret-a');
});

test('failed saves do not change settings; subsequent updates can succeed', async () => {
    let fail = true;
    const settings = new SettingsManager({loadData:async()=>null,saveData:async()=>{if(fail)throw new Error('disk');}});
    await settings.loadSettings();
    await assert.rejects(settings.updateSettings({activeThemeId:'orange'}),/disk/);
    assert.equal(settings.getSettings().activeThemeId,'default');
    fail = false;
    await settings.updateSettings({activeThemeId:'minimal'});
    assert.equal(settings.getSettings().activeThemeId,'minimal');
});

test('deleting an account updates default and last-used selection', async () => {
    const settings = new SettingsManager({loadData:async()=>({wechatAccounts:[account('a'),account('b')],defaultAccountId:'a',lastSelectedAccountId:'a'}),saveData:async()=>{}});
    await settings.loadSettings();
    await settings.deleteAccount('a');
    assert.equal(settings.getSettings().defaultAccountId,'b');
    assert.equal(settings.getSettings().lastSelectedAccountId,'');
});

test('themes returned for editing cannot mutate presets or persisted settings', async () => {
    const settings = new SettingsManager({loadData:async()=>null,saveData:async()=>{}});
    await settings.loadSettings();
    const themes = new ThemeManager(settings);
    const original = themes.getActiveThemeCSS();
    themes.getAllThemes()[0].title.h1.content='color:hotpink';
    assert.equal(themes.getActiveThemeCSS(),original);
    const custom = themes.getAllThemes()[0];
    custom.id = 'custom'; custom.isPreset = false; custom.paragraph='color:red;';
    await settings.updateSettings({structuredThemes:[custom],activeThemeId:'custom'});
    assert.match(themes.getActiveThemeCSS(),/color:red/);
    custom.paragraph='color:blue;';
    assert.doesNotMatch(themes.getActiveThemeCSS(),/color:blue/);
});
