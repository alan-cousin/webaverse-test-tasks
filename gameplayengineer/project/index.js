import url from 'url';
import { createRunner, PuppeteerRunnerExtension } from '@puppeteer/replay';
import pti from 'puppeteer-to-istanbul';
import puppeteer from 'puppeteer';
import fs from 'fs'
import chai from 'chai' 
import { parse } from 'path';
var expect = chai.expect;  

let score = 0;
let positionX = 0;
let positionY = 0;
let positionZ = 0;
let positionXAfter = 0;
let positionYAfter = 0;
let positionZAfter = 0;
let jumpCount = 0;
let lastJump = 0;
const timeLimit = 1000;
let cur_time = 0; 
let stepCount = 0;
let posElement = {};
let highestElement = {};
let posContent = {};

const browser = await puppeteer.launch({
    headless: true,
});

const page = await browser.newPage();
await page.goto('https://webaverse-alan-cousin.netlify.app/')
const f = await page.$("#highest")
const text = await (await f.getProperty('textContent')).jsonValue()

const moveForward = [
  {
    "type": "keyDown",
    "target": "main",
    "key": "w"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "w"
  }

]

const moveBackward = [
  {
    "type": "keyDown",
    "target": "main",
    "key": "s"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "s"
  }
]

const moveRight = [
  {
    "type": "keyDown",
    "target": "main",
    "key": "d"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "d"
  }
]

const moveLeft = [
  {
    "type": "keyDown",
    "target": "main",
    "key": "a"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "a"
  }
]

const singleJump = [
  {
    "type": "keyDown",
    "target": "main",
    "key": " "
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": " "
  }
]

const doubleJump = [
  {
    "type": "keyDown",
    "target": "main",
    "key": " "
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": " "
  },
  {
    "type": "keyDown",
    "target": "main",
    "key": " "
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": " "
  }
]

// move to the third floor manually
{
  const targetPage = page;

  // step 1: Move ball to the right
  await targetPage.keyboard.down("d", 0);
  await targetPage.keyboard.up("d", 0);
  await targetPage.keyboard.down("d", 0);
  await targetPage.keyboard.up("d", 0);
  await targetPage.keyboard.down("d", 0);
  await targetPage.keyboard.up("d", 0);

  // step 2: Move ball to the bottom of the first box 
  await targetPage.keyboard.down("w", 0);
  await targetPage.keyboard.up("w", 0);
  await targetPage.keyboard.down("w", 0);
  await targetPage.keyboard.up("w", 0);
  await targetPage.keyboard.down("w", 0);
  await targetPage.keyboard.up("w", 0);
  await targetPage.keyboard.down("w", 0);
  await targetPage.keyboard.up("w", 0);

  // step 3: Jump over the first box
  await targetPage.keyboard.press(" ", 1000);
  await targetPage.keyboard.down("w", 0);
  await targetPage.keyboard.up("w", 0);

  // step 4: Move ball to the bottom of the second box
  await targetPage.keyboard.down("a", 0);
  await targetPage.keyboard.up("a", 0);

  // step 5: Jump over the second box/floor
  await targetPage.keyboard.press(" ", 1000);
  await targetPage.keyboard.down("a", 0);
  await targetPage.keyboard.up("a", 0);

  // step 6: Move ball to the bottom of the third box
  await targetPage.keyboard.down("a", 0);
  await targetPage.keyboard.up("a", 0);
  await targetPage.keyboard.down("a", 0);
  await targetPage.keyboard.up("a", 0);

  // step 7: Jump over the third box/floor
  await targetPage.keyboard.press(" ", 1000);
  await targetPage.keyboard.down("a", 0);
  await targetPage.keyboard.up("a", 0);
}

class CoverageExtension extends PuppeteerRunnerExtension {
     
    async startCoverage() {
        // Enable both JavaScript and CSS coverage
        await Promise.all([
            page.coverage.startJSCoverage(),
            page.coverage.startCSSCoverage(),
        ]);
    }

    async stopCoverage() {
        // Disable both JavaScript and CSS coverage
        const [jsCoverage, cssCoverage] = await Promise.all([
            page.coverage.stopJSCoverage(),
            page.coverage.stopCSSCoverage(),
        ]);
        let totalBytes = 0;
        let usedBytes = 0;
        const coverage = [...jsCoverage, ...cssCoverage];
        for (const entry of coverage) {
          totalBytes += entry.text.length;
          for (const range of entry.ranges) usedBytes += range.end - range.start - 1;
        }
        console.log(`Bytes used: ${(usedBytes / totalBytes) * 100}%`);
        pti.write(coverage, { includeHostname: true , storagePath: './.nyc_output' })
    }

    async beforeAllSteps(flow) {
      await super.beforeAllSteps(flow);
      await this.startCoverage();
      const dir = './testOutputs';
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
      }
      
      console.log('starting');
    }
    
    async beforeEachStep(step, flow) {
      await super.beforeEachStep(step, flow);
      cur_time = Date.now()/1000;
      if (stepCount == 3) {
        posElement = await page.$("#position")
        highestElement = await page.$("#highest")
      }

      if (stepCount >= 3 ){
        posContent = await (await posElement.getProperty('textContent')).jsonValue()
        const position = posContent.split(" ");
        positionX = parseFloat(position[1])
        positionY = parseFloat(position[2])
        positionZ = parseFloat(position[3])
        console.log("posXElement, posYElement is, posZElement is", positionX, positionY, positionZ)
      }

      console.log("stepCount is", stepCount)
      console.log('before', step);

    }
    
    async afterEachStep(step, flow) {
      await super.afterEachStep(step, flow);
      if (stepCount >= 3) {
        posContent = await (await posElement.getProperty('textContent')).jsonValue()
        const text = await (await highestElement.getProperty('textContent')).jsonValue()
        const positionAfter = posContent.split(" ");
        positionXAfter = parseFloat(positionAfter[1])
        positionYAfter = parseFloat(positionAfter[2])
        positionZAfter = parseFloat(positionAfter[3])
        const highest = parseFloat(text.split(" ").pop());

        console.log("current height is: ", highest)
        if (highest > score) {
          score = highest;         
          await page.screenshot({ path: `./testOutputs/{${score}}.png` });
        }
        
        console.log("positionXAfter , positionYAfter, positionZAfter is", positionXAfter, positionYAfter, positionZAfter)
      
        // Move to the third floor automatically  
        // step 1: move right to position()
        if (positionX < 65) {
          console.log("positionX is", positionX)
          flow.steps.push(moveRight[0])
          flow.steps.push(moveRight[1])
          console.log("positionX after auto move is", positionX)
          if (positionX > 80) {
            flow.steps.push(moveLeft[0])
            flow.steps.push(moveLeft[1])
          }
        } 
        
        // step 2: move forward to first box
        if (positionZ > 60) {
          flow.steps.push(moveForward[0])
          flow.steps.push(moveForward[1])
          if (positionZ < 90) {
            flow.steps.push(moveBackward[0])
            flow.steps.push(moveBackward[1])
          }
        }

        // step 3: jump over the first box/floor
        if (positionY < 60) {
          flow.steps.push(singleJump[0])
          flow.steps.push(singleJump[1])
          flow.steps.push(moveForward[0])
          flow.steps.push(moveForward[1])
        }

        // step 4: jump over the second box/floor
        if (positionY < 180) {
          flow.steps.push(doubleJump[0])
          flow.steps.push(doubleJump[1])
          flow.steps.push(doubleJump[2])
          flow.steps.push(doubleJump[3])
          flow.steps.push(moveLeft[0])
          flow.steps.push(moveLeft[1])
        } 

        // step 5: move and jump over the third box/floor
        if (positionY < 321.1) {
          flow.steps.push(doubleJump[0])
          flow.steps.push(doubleJump[1])
          flow.steps.push(moveLeft[0])
          flow.steps.push(moveLeft[1])
        } 

        // key check
        if ((step.type == 'keyUp') && (step.key == 'w')) {
            console.log("w key was succesfully inputed");
            try {
              expect(positionZ).to.be.greaterThan(positionZAfter)
              } catch (e) { 
              console.log ("w key not inputed")
            }
        }

        if ((step.type == 'keyUp') && (step.key == 's')) {
            console.log("s key was succesfully inputed");
            try { 
              expect(positionZAfter).to.be.greaterThan(positionZ)
            } catch (e) { 
              console.log ("s key not inputed")
            }
        }

        if ((step.type == 'keyUp') && (step.key == 'a')) {
            console.log("a key was succesfully inputed");
            try { 
              expect(positionX).to.be.greaterThan(positionXAfter)
            } catch (e) { 
              console.log ("a key not inputed")
            }
          }

        if ((step.type == 'keyUp') && (step.key == 'd')) {
          console.log("d key was succesfully inputed");
          try {
            expect(positionXAfter).to.be.greaterThan(positionX)
          } catch (e) { 
            console.log ("d key not inputed")
          }
        }      
        
        if ((Date.now()-lastJump) > timeLimit) {
          jumpCount = 0;
        }
        
        if ((step.type == 'keyDown') && (step.key == ' ')) {
          console.log("Space key was succesfully inputed");
          if (jumpCount < 2)
          {
            try {
              expect(positionYAfter).to.be.greaterThan(positionY)  //check first space jump
              jumpCount ++;
              lastJump = Date.now();
            } catch (e) {
              console.log("jump failed")
            } 
          } else{
            console.log("Jumping is disable after double Jump.")
          }
          
        }
      }

      stepCount++; //count steps
      console.log('after', step);

    }

    async afterAllSteps(flow) {
      await this.stopCoverage();
      await super.afterAllSteps(flow);
      console.log('Test Done.');
    }
}

export const flow = {
  "title": "complete_test",
  "steps": [
    {
      "type": "emulateNetworkConditions",
      "download": 180000,
      "upload": 84375,
      "latency": 562.5
    },
    {
      "type": "setViewport",
      "width": 1920,
      "height": 937,
      "deviceScaleFactor": 1,
      "isMobile": false,
      "hasTouch": false,
      "isLandscape": false
    },
    {
      "type": "navigate",
      "assertedEvents": [
        {
          "type": "navigation",
          "url": "https://webaverse-alan-cousin.netlify.app/",
          "title": "Jumping Test"
        }
      ],
      "url": "https://webaverse-alan-cousin.netlify.app/",
      "timeout": 30000
    },    
    {
      "type": "keyDown",
      "target": "main",
      "key": " "
    },
    {
      "type": "keyUp",
      "target": "main",
      "key": " "
    },
  ]
}

export async function run(extension) {
    const runner = await createRunner(flow, extension);
    await runner.run();
}
  
if (process && import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    const extension = new CoverageExtension(browser, page, 7000)
    await run(extension);
}
  
await browser.close();