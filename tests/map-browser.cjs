#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const out = path.resolve(__dirname, '../test-artifacts');
  fs.mkdirSync(out, { recursive:true });
  const launch = { headless:true, args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] };
  if (process.env.CHROME_BIN) launch.executablePath = process.env.CHROME_BIN;
  let browser;
  let page;
  const errors=[];
  const failedRequests=[];
  try {
    browser = await chromium.launch(launch);
    page = await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    page.on('requestfailed',req=>failedRequests.push(req.url()+' '+(req.failure()?.errorText||'')));
    page.on('console',msg=>{if(msg.type()==='error'||msg.type()==='warning')console.log('BROWSER '+msg.type()+': '+msg.text());});
    page.on('pageerror', err=>errors.push(err.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(() => {
      const status = window.AfterimageCityMap?.status?.();
      return !!(status && status.ready && status.employers === 10 &&
        status.organizations === 99 && status.compassClusters === 6);
    },null,{timeout:22000});
    const status = await page.evaluate(()=>window.AfterimageCityMap.status());
    assert.equal(status.loaded,true,'MapLibre loaded a vector-map style');
    assert.equal(status.fallback,false,'The map is visible, not the error fallback');
    assert.equal(await page.locator('#city-map .maplibregl-canvas').count(),1);
    assert.equal(await page.locator('#city-map .maplibregl-ctrl-zoom-in').count(),1);
    assert.equal(await page.locator('#jobs-list .job-card').count(),10,'Job list still visible');
    assert.equal(await page.locator('#directory-list .dir-row').count(),99,'Directory still visible');
    await page.screenshot({path:path.join(out,'map-desktop.png'),fullPage:false});

    await page.locator('#global-search').fill('Disney');
    await page.waitForFunction(()=>window.AfterimageCityMap?.status?.().employers===1,null,{timeout:5000});
    assert.equal(await page.locator('#jobs-list .job-card').count(),1,'Search updates both list and map');
    await page.locator('#global-search').fill('');
    await page.waitForFunction(()=>window.AfterimageCityMap?.status?.().employers===10,null,{timeout:5000});

    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+5);
    assert.equal(overflow,false,'Map must not cause horizontal mobile overflow');
    await page.screenshot({path:path.join(out,'map-mobile.png'),fullPage:false});
    assert.deepEqual(errors,[], 'No uncaught page errors');
    console.log('SUCCESS: real vector streets loaded with 10 employers, 6 Compass centroid groups, 99 directory records.');
  } catch (error) {
    console.error('Real browser map smoke test failed:',error.message);
    console.error('Failed requests:',failedRequests.slice(0,30));
    console.error('Page errors:',errors.slice(0,30));
    if(page){
      try{
        console.error('Map diagnostic:',JSON.stringify(await page.evaluate(()=>({
          status:window.AfterimageCityMap?.status?.()||null,
          maplibrePresent:!!window.maplibregl,
          supported:window.maplibregl?.supported?.(),
          mapElement:!!document.getElementById('city-map'),
          fallbackText:document.getElementById('city-map-fallback')?.innerText,
          mapStylesheets:[...document.styleSheets].map(x=>x.href).filter(Boolean)
        }))));
        await page.screenshot({path:path.join(out,'map-error.png'),fullPage:false});
      }catch(inner){console.error('Failed to capture map diagnostic:',inner.message);}
    }
    throw error;
  } finally {
    if(browser)await browser.close();
  }
})().catch(()=>process.exit(1));
