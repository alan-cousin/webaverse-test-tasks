import url from 'url';
import {
  createRunner,
  PuppeteerRunnerExtension
} from '@puppeteer/replay';
import pti from 'puppeteer-to-istanbul';
import puppeteer from 'puppeteer';
import fs from 'fs'
import chai from 'chai'
import {
  parse
} from 'path';
import {
  dir
} from 'console';
var expect = chai.expect;

let score = 100;

let posX = 0;
let posY = 0;
let posZ = 0;
let jumpCount = 0;
let lastJump = 0;
const timeLimit = 1000;
let cur_time = 0;
let stepCount = 0;
let posElement = {};
let highestElement = {};
let posContent = {};

const browser = await puppeteer.launch({
  headless: false,
});

const page = await browser.newPage();
await page.goto('https://webaverse-alan-cousin.netlify.app/')
const f = await page.$("#highest")
const text = await (await f.getProperty('textContent')).jsonValue()
const platformSize = {
  x: 100,
  y: 40,
  z: 100
};
const platformPoses = [{
    x: 100,
    y: 30,
    z: 0
  },
  {
    x: -100,
    y: 30,
    z: 0
  },
  {
    x: 0,
    y: 150,
    z: 0
  },
]
const moveSteps = [{
    "type": "keyDown",
    "target": "main",
    "key": "a"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "a"
  },
  {
    "type": "keyDown",
    "target": "main",
    "key": "d"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "d"
  },
  {
    "type": "keyDown",
    "target": "main",
    "key": "w"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "w"
  },
  {
    "type": "keyDown",
    "target": "main",
    "key": "s"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "s"
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
  {
    "type": "keyDown",
    "target": "main",
    "key": "x"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "x"
  }
]


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
    pti.write(coverage, {
      includeHostname: true,
      storagePath: './.nyc_output'
    })
  }

  async beforeAllSteps(flow) {
    await super.beforeAllSteps(flow);
    await this.startCoverage();
    const dir = './testOutputs';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      });
    }

    console.log('===================== Start Game Play Test ==================');
  }

  async beforeEachStep(step, flow) {
    console.log("------------------------new step-------------------");
    console.log(step);
    await super.beforeEachStep(step, flow);
    console.log("Step Start Time : " + (Date.now() / 1000 - cur_time));
    cur_time = Date.now() / 1000;

    if (stepCount == 3) {
      posElement = await page.$("#position")
      highestElement = await page.$("#highest")
    }

    if (stepCount >= 3) {
      //posContent = await (await posElement.getProperty('textContent')).jsonValue()
      // const position = posContent.split(" ");
      // positionX = parseFloat(position[1])
      // positionY = parseFloat(position[2])
      // positionZ = parseFloat(position[3])

      //  console.log("Before Position = ", positionX, positionY, positionZ)
    }

    //console.log("Step before Time : " + (Date.now() / 1000 - cur_time));
    //cur_time = Date.now() / 1000;

  }
  addStep(flow, direction, isJump) {
    console.log("Add Step " + direction);
    if (isJump) {
      flow.steps.push(moveSteps[8]);
      flow.steps.push(moveSteps[8]);
     
      
    }
    switch (direction) {
      case "stop":
        flow.steps.push(moveSteps[10]);
        flow.steps.push(moveSteps[11]);

        break;
      case "left":
        flow.steps.push(moveSteps[0]);
        flow.steps.push(moveSteps[1]);
        break;
      case "right":
        flow.steps.push(moveSteps[2]);
        flow.steps.push(moveSteps[3]);
        break;
      case "up":
        flow.steps.push(moveSteps[4]);
        flow.steps.push(moveSteps[5]);
        break;
      case "down":
        flow.steps.push(moveSteps[6]);
        flow.steps.push(moveSteps[7]);
        break;
    }
    if (isJump) {
      //flow.steps.push(moveSteps[9]);
    }
  }

  moveToPlatform(flow, posX, posY, posZ, non_mv_dir) {
    let obj_pf = 0;

    // check height determine whether go to platform 3 or not.
    if (posY < platformPoses[1].y + platformSize.y / 2) {
      // Choose the closest platform between Platform 1 and Platform 2
      const dist_pf1 = Math.pow(platformPoses[0].x - posX, 2) + Math.pow(platformPoses[0].z - posZ, 2);
      const dist_pf2 = Math.pow(platformPoses[1].x - posX, 2) + Math.pow(platformPoses[1].z - posZ, 2);
      obj_pf = dist_pf1 <= dist_pf2 ? 0 : 1;
    } else if (posY < platformPoses[2].y) {
      this.addStep(flow, "stop", false);
      return false;
      obj_pf = 2;
    } else {
      console.log("====================== Test Finished ============================");
      return false;
    }
    // distance to closest platform basis on X,Z directoin
    const distToPF = Math.sqrt(Math.pow(platformPoses[obj_pf].x - posX, 2) + Math.pow(platformPoses[obj_pf].z - posZ, 2));


    // radius of platform
    const pf_radius = Math.sqrt(Math.pow(platformSize.x / 2, 2) + Math.pow(platformSize.z / 2, 2));

    console.log("distance:, radius, x-dist:, y-dist:", distToPF, pf_radius,Math.abs(posX - platformPoses[obj_pf].x), Math.abs(posZ - platformPoses[obj_pf].z));
    let isJump = false;
    // if player is enough close to objective platfrom, jump to platform
    if (distToPF <= pf_radius) {
      isJump = true;
      // this.addStep(flow, "jump");
      //this.addStep(flow, "jump");
    }
    console.log("Target Pos ;" + platformPoses[obj_pf].x + " " + platformPoses[obj_pf].y + " " + platformPoses[obj_pf].z);
    if (non_mv_dir!= 2 && Math.abs(posX - platformPoses[obj_pf].x) > Math.abs(posZ - platformPoses[obj_pf].z)) {
      if (posX < platformPoses[obj_pf].x) {
        this.addStep(flow, "right", isJump);
      } else if (posX > platformPoses[obj_pf].x) {
        this.addStep(flow, "left", isJump);
      }
    } else {
      if (posZ < platformPoses[obj_pf].z) {
        this.addStep(flow, "down", isJump);
      } else if (posZ > platformPoses[obj_pf].z) {
        this.addStep(flow, "up", isJump);
      }
    }
    return true;
  }

  async afterEachStep(step, flow) {
    await super.afterEachStep(step, flow);

    console.log("Step after Time : " + (Date.now() / 1000 - cur_time));
    cur_time = Date.now() / 1000;
    if (stepCount >= 4 && step.type == "keyUp") {
      const posX_old = posX;
      const posY_old = posY;
      const posZ_old = posZ;

      posContent = await (await posElement.getProperty('textContent')).jsonValue()
      // const text = await (await highestElement.getProperty('textContent')).jsonValue()
      // const highest = parseFloat(text.split(" ").pop());
      const positionAfter = posContent.split(" ");
      posX = parseFloat(positionAfter[1])
      posY = parseFloat(positionAfter[2])
      posZ = parseFloat(positionAfter[3])


      

      if (posY > score) {
        score = posY;
        page.screenshot({
          path: `./testOutputs/{${score}}.png`
        });
      }

      console.log("After Position", posX, posY, posZ)
      let non_movable_direction = 0;
      // key check
      if ((step.type == 'keyUp') && (step.key == 'w')) {
        try {
          expect(posZ_old).to.be.greaterThan(posZ)
          non_movable_direction = 1;
        } catch (e) {
          console.log("'W' doesn't works properly.")
          non_movable_direction = 1;

        }
      }

      if ((step.type == 'keyUp') && (step.key == 's')) {
        try {
          expect(posZ).to.be.greaterThan(posZ_old)
          
        } catch (e) {
          console.log("'s' doesn't works properly.")
          non_movable_direction = 1;

        }
      }

      if ((step.type == 'keyUp') && (step.key == 'a')) {
        try {
          expect(posX_old).to.be.greaterThan(posX)
        } catch (e) {
          console.log("'A' doesn't works properly.")
          non_movable_direction = 2;
        }
      }

      if ((step.type == 'keyUp') && (step.key == 'd')) {
        try {
          expect(posX).to.be.greaterThan(posX_old)
          
        } catch (e) {
          console.log("'D' doesn't works properly.")
          non_movable_direction = 2;
        }
      }

      if ((Date.now() - lastJump) > timeLimit) {
        jumpCount = 0;
      }

      if ((step.type == 'keyDown') && (step.key == ' ')) {
        if (jumpCount < 2) {
          try {
            expect(posY).to.be.greaterThan(posY) //check first space jump
            jumpCount++;
            lastJump = Date.now();
          } catch (e) {
            console.log("jump failed")
          }
        } else {
          console.log("Jumping is disable after double Jump.")
        }

      }
      if (flow.steps.length - 1 == stepCount)
        this.moveToPlatform(flow, posX, posY, posZ, non_movable_direction );
    }
    expect(posY).to.be.greaterThan(-100) //check first space jump
    console.log("Step End Time : " + (Date.now() / 1000 - cur_time));
    cur_time = Date.now() / 1000;
    console.log("///////////////////////////////////////////////////////End Step");

    stepCount++; //count steps

  }

  async afterAllSteps(flow) {
    await this.stopCoverage();
    await super.afterAllSteps(flow);
    console.log('Test Done.');
  }
}

export const flow = {
  "title": "Game Play Test",
  "steps": [{
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
      "assertedEvents": [{
        "type": "navigation",
        "url": "https://webaverse-alan-cousin.netlify.app/",
        "title": "Jumping Test"
      }],
      "url": "https://webaverse-alan-cousin.netlify.app/",
      "timeout": 30000
    },
    {
      "type": "keyDown",
      "target": "main",
      "key": "a"
    },
    {
      "type": "keyUp",
      "target": "main",
      "key": "a"
    },

  ]
}

export async function run(extension) {
  const runner = await createRunner(flow, extension);
  await runner.run();
}

if (process &&
  import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const extension = new CoverageExtension(browser, page, 7000)
  await run(extension);
}

await browser.close();