import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers.mjs';

const { WechatApiClient } = loadTs('src/integrations/wechat/wechat-api-client.ts');
const { ImageUploadCache, imageFingerprint } = loadTs('src/integrations/obsidian/image-cache.ts');
const logger = {debug(){},info(){},warn(){},error(){}};
const account = {id:'a',name:'A',appId:'app-a',appSecret:'secret-a'};
const response = (payload,status=200) => ({text:JSON.stringify(payload),status});

test('token requests are shared and errors explain invalid secrets immediately', async () => {
    let calls=0;
    const client = new WechatApiClient(account,logger,async()=>{calls++;return response({access_token:'token',expires_in:7200});});
    assert.deepEqual(await Promise.all([client.getAccessToken(),client.getAccessToken()]),['token','token']);
    assert.equal(calls,1);
    const invalid = new WechatApiClient(account,logger,async()=>{calls++;return response({errcode:40125,errmsg:'invalid appsecret'});});
    await assert.rejects(invalid.getAccessToken(),/40125.*App secret/);
    assert.equal(calls,2);
});

test('ambiguous write failures are not automatically retried', async () => {
    let writes=0;
    const client=new WechatApiClient(account,logger,async options=>{
        if(options.url.includes('stable_token'))return response({access_token:'token'});
        writes++;throw new Error('network lost');
    });
    await assert.rejects(client.request('/cgi-bin/draft/add',{method:'POST'},'创建草稿'),/先检查微信端结果/);
    assert.equal(writes,1);
});

test('explicit expired-token errors trigger only one refresh and replay',async()=>{
    let tokens=0,writes=0;
    const client=new WechatApiClient(account,logger,async options=>{
        if(options.url.includes('stable_token'))return response({access_token:'token-'+(++tokens)});
        writes++;return writes===1 ? response({errcode:42001,errmsg:'expired'}) : response({media_id:'draft'});
    });
    assert.equal((await client.request('/cgi-bin/draft/add',{method:'POST'},'创建草稿')).media_id,'draft');
    assert.equal(tokens,2);assert.equal(writes,2);
});

test('upload cache keys isolate accounts and change when image bytes change',async()=>{
    let saved;
    const cache = new ImageUploadCache({exists:async()=>false,write:async(_path,data)=>{saved=JSON.parse(data);}},'cache.json');
    const a=await imageFingerprint(new Uint8Array([1,2]).buffer);
    const b=await imageFingerprint(new Uint8Array([1,3]).buffer);
    assert.notEqual(a,b);
    await cache.put('a:'+a,{url:'https://image/a',media_id:'a'},cache.revision);
    assert.equal(cache.get('b:'+a),undefined);
    assert.equal(cache.get('a:'+b),undefined);
    assert.equal(saved.entries['a:'+a].media_id,'a');
    const old=cache.revision;
    await cache.clear();
    await cache.put('late',{url:'https://image/late',media_id:'late'},old);
    assert.equal(cache.size,0);
});

test('account sessions retain credentials and identical bytes are reused per account',async()=>{
    const uploads=[];
    const transport=async options=>{
        if(options.url.includes('stable_token'))return response({access_token:JSON.parse(options.body).appid});
        const id=new URL(options.url).searchParams.get('access_token');
        uploads.push(id);return response({url:'https://image/'+id,media_id:id});
    };
    const {WechatPublisher}=loadTs('src/integrations/wechat/wechat-publisher.ts',{requestUrl:transport});
    const accounts={a:{...account},b:{...account,id:'b',appId:'app-b'}};
    const cache=new ImageUploadCache({write:async()=>{}},'cache.json');
    const publisher=new WechatPublisher({getAccount:id=>accounts[id]},cache,logger);
    const a=publisher.createSession('a');
    const b=publisher.createSession('b');
    accounts.a.appId='edited-later';
    const data=new Uint8Array([137,80,78,71,13,10]).buffer;
    await Promise.all([a.upload(data,'a.png'),b.upload(data,'b.png'),a.upload(data,'again.png')]);
    assert.deepEqual(uploads.sort(),['app-a','app-b']);
    assert.equal(a.account.appId,'app-a');
});

test('cache loading discards expired records and enforces its size limit',async()=>{
    const entries = Object.fromEntries(Array.from({length:2005},(_,index)=>[String(index),{url:'https://image/'+index,media_id:String(index),uploadedAt:Date.now()}]));
    entries.expired={url:'https://image/old',media_id:'old',uploadedAt:1};
    const cache=new ImageUploadCache({exists:async()=>true,read:async()=>JSON.stringify({version:1,entries})},'cache.json');
    await cache.load();
    assert.equal(cache.size,2000);
    assert.equal(cache.get('expired'),undefined);
});
