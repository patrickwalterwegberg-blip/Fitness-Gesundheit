import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {sharedBackend,sharedIds} from './shared-backend';
test('real controlling export has an accurate filename and spreadsheet-safe employee names',async({page})=>{
 await sharedBackend(page,{role:'admin'});
 const name='\n=HYPERLINK("https://example.org";"Name")';
 await page.route('https://teamhub-test.supabase.co/rest/v1/rpc/admin_controlling',route=>route.fulfill({json:{profiles:[{id:sharedIds.colleague,full_name:name,role:'employee',active:true}],studios:[{id:sharedIds.studio,name:'Dörpen'}],tasks:[],courses:[],assignments:[],progress:[]}}));
 await page.goto('/tests/workspace.html');await page.getByRole('button',{name:'Controlling',exact:true}).click();await expect(page.getByRole('heading',{name:'Dein Team im Überblick.',exact:true})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'CSV exportieren',exact:true}).click();const file=await pending;expect(file.suggestedFilename()).toBe('fg-controlling.csv');
 const content=await readFile(await file.path(),'utf8');expect(content).toContain('"\'\n=HYPERLINK(""https://example.org"";""Name"")"');
});
