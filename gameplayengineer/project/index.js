import url from 'url';
import {
  createRunner,
  PuppeteerRunnerExtension
} from '@puppeteer/replay';
import pti from 'puppeteer-to-istanbul';
import puppeteer from 'puppeteer';
import fs from 'fs'
import chai from 'chai'
import test from 'test'

var expect = chai.expect;
/**
 * Highest Score
 * @type : number
 */
let score = 100;
/**
 * player(ball)'s posisiton
 * posX:X-coordinate,posY:Y-coordinate,posZ:Z-coordinate,
 * @type : number
 */
let posX = 0;
let posY = 19;
let posZ = 200;

/**
 * used to determine whether continue to jump
 * Max continuos jumping count is 2
 * @type : number
 */
let jumpCount = 0;

/**
 * Last jump time as milisecond => Date.Now()
 * @type : number
 */
let lastJump = 0;

/**
 * used to scrap Player's position data
 * @type : UI Element
 */
let posElement = {};
/**
 * used to scrap Player's highest score
 * @type : UI Element
 */
let highestElement = undefined;
/**
 * Platform Index which automated user try to stand on
 * @type : Number
 */
let targetPF = 0;

/**
 * Platform's size
 * @type:Object{x:Number, y:Number, z:Number}
 */
const pfDefautSize = {
  x: 100,
  y: 40,
  z: 100
};

/**
 * Positions of first 3 platforms
 * @type : Array<Vector3>
 */
const staticPFPoses = [{
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
  }
]
/**
 * Key Event Template for dynamic appending 
 * @type : Array<KeyEvent>
 */
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
/**
 * 
 * @type : number
 */
const timeLimit = 1000;
/**
 * Task ID in Task Description
 * 1 -> verify all movement
 * 2 -> automate jump up to Platform 3
 *   -> save highest score screen shot
 * it will be changed by input "X" key event
 * @type : number
 */
let taskID = 0;
/**
 * Represent current step's index
 * @type : Number
 */
let stepCounter = 0;
const browser = await puppeteer.launch({
  headless: false,
});
const page = await browser.newPage();
await page.goto('https://webaverse-alan-cousin.netlify.app/')



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

    /// create output directory
    const dir = './testOutputs';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      });
    }

    console.log('===================== Start Game Play Test ==================');
  }

  async beforeEachStep(step, flow) {
    console.log("------------------------new step---------------------");
    await super.beforeEachStep(step, flow);
    console.log(step);
    stepCounter++;
  }
  verifyAllMovement() {

  }
  async afterEachStep(step, flow) {

    await super.afterEachStep(step, flow);

    // after navigate url, get UI Element
    if (step.type == "navigate") {
      posElement = await page.$("#position")
      highestElement = await page.$("#highest")
    }
    /// only process keyUp event
    if (step.type != "keyUp") {
      console.log("-------------------------End Step --------------------");
      return;
    }
    if (step.key == "x") {
      taskID++;
      console.log("-------------------------End Step --------------------");
      //return;
    }

    /// save last position(previous position) of player before read new position
    const posOldX = posX;
    const posOldY = posY;
    const posOldZ = posZ;
    console.log("Player Position ->", posOldX, posOldY, posOldZ);
    /// read position info of game player
    const posContent = await (await posElement.getProperty('textContent')).jsonValue()
    const positionAfter = posContent.split(" ");
    posX = parseFloat(positionAfter[1]);
    posY = parseFloat(positionAfter[2]);
    posZ = parseFloat(positionAfter[3]);
    console.log("Player Position ->", posX, posY, posZ);

    if (taskID == 1) {

      if (step.key == 'w') {
        try {
          expect(posOldZ).to.be.greaterThan(posZ)
        } catch (e) {
          console.log("'W' doesn't works properly.")
          non_movable_direction = 1;

        }
      }

      if (step.key == 's') {
        try {
          expect(posZ).to.be.greaterThan(posOldZ)

        } catch (e) {
          console.log("'s' doesn't works properly.")
          non_movable_direction = 1;

        }
      }

      if (step.key == 'a') {
        try {
          expect(posOldX).to.be.greaterThan(posX)
        } catch (e) {
          console.log("'A' doesn't works properly.")
          non_movable_direction = 2;
        }
      }

      if (step.key == 'd') {
        try {
          expect(posX).to.be.greaterThan(posOldX)

        } catch (e) {
          console.log("'D' doesn't works properly.")
          non_movable_direction = 2;
        }
      }

      if ((Date.now() - lastJump) > timeLimit) {
        jumpCount = 0;
      }

      if (step.key == ' ') {
        if (jumpCount < 2) {
          try {
            expect(posY).to.be.greaterThan(posOldY)
            jumpCount++;
            lastJump = Date.now();
          } catch (e) {
            console.log("jump failed")
          }
        } else {
          console.log("Jumping is disable after double Jump.")
        }

      }

      /*step.key == 'w' && test("'W' doesn't works properly.", () => {
        expect(posOldZ).to.be.greaterThan(posZ);
      });
      step.key == 's' && test("'S' doesn't works properly.", () => {
        expect(posZ).to.be.greaterThan(posOldZ);
      });
      step.key == 'a' && test("'A' doesn't works properly.", () => {
        expect(posOldX).to.be.greaterThan(posX);
      });
      step.key == 'd' && test("'D' doesn't works properly.", () => {
        expect(posX).to.be.greaterThan(posOldX);
      });

      (Date.now() - lastJump > timeLimit) && (jumpCount = 0);
      (step.key == ' ' && jumpCount < 2) && test("Jumping doesn't works properly.", () => {
        expect(posY).to.be.greaterThan(posOldY)
        jumpCount++;
        lastJump = Date.now();
      });*/

    } else if (taskID == 2) {
      if (highestElement) {
        /// read highest score info of game player
        const text = await (await highestElement.getProperty('textContent')).jsonValue()
        const highest = parseFloat(text.split(" ").pop());
        /// if user achieved the highest score, there is captured auto-matically.
        if (highest > score) {
          score = highest;
          page.screenshot({
            path: `./testOutputs/{${score}}.png`
          });
        }
      }
      if (stepCounter == flow.steps.length) {
        
        const non_movable_direction = (posOldZ == posZ && (step.key == "w" || step.key == "s")) ? 1 : ((posX == posOldX && (step.key == "a" || step.key == "d")) ? 2 : 0);
        this.movePlayer(flow, posX, posY, posZ, non_movable_direction);
      }
    }
    console.log("-------------------------End Step --------------------");
  }

  async afterAllSteps(flow) {
    await this.stopCoverage();
    await super.afterAllSteps(flow);
    console.log('==========================End All Test Success================================');
  }
  /**
   * add key event to test-flow
   * @param {*} flow 
   * @param {moviding direction of this event} direction 
   * @param {does this event include jumping move?} isJump 
   */
  addKeyEvent(flow, direction, isJump) {
    console.log("Add Step " + direction);
    if (isJump) {
      flow.steps.push(moveSteps[8]);
      flow.steps.push(moveSteps[9]);
      flow.steps.push(moveSteps[8]);
      flow.steps.push(moveSteps[9]);
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


  /**
   * move player to target platform
   * @param {step flow, @type:ObjectP{steps:Array<>} flow 
   * @param {player position X} posX 
   * @param {player position Y} posY 
   * @param {player position Z} posZ 
   * @param {Indicates a direction in which the user cannot move forward.} non_mv_dir 
   * @returns 
   */
  movePlayer(flow, posX, posY, posZ, non_mv_dir) {

    /// current target PF's index in static PF POSES
    if (posY < staticPFPoses[1].y) {
      const dist_pf1 = Math.pow(staticPFPoses[0].x - posX, 2) + Math.pow(staticPFPoses[0].z - posZ, 2);
      const dist_pf2 = Math.pow(staticPFPoses[1].x - posX, 2) + Math.pow(staticPFPoses[1].z - posZ, 2);

      targetPF = dist_pf1 <= dist_pf2 ? 0 : 1;
    }

    let distToPF = Math.sqrt(Math.pow(staticPFPoses[targetPF].x - posX, 2) + Math.pow(staticPFPoses[targetPF].z - posZ, 2));
    if (distToPF < 10 && targetPF < 2) {
      targetPF = 2;
      distToPF = Math.sqrt(Math.pow(staticPFPoses[targetPF].x - posX, 2) + Math.pow(staticPFPoses[targetPF].z - posZ, 2));
      console.log("Reach Movestep 2");
    } else if (distToPF < 10 && targetPF == 2) {
      console.log("====================== Test Finished ============================");
      return false;
    }
    console.log("Target Objective : ", targetPF);
    // radius of platform
    const pf_radius = Math.sqrt(Math.pow(pfDefautSize.x / 2, 2) + Math.pow(pfDefautSize.z / 2, 2));

    console.log("distance:, radius, x-dist:, y-dist:", distToPF, pf_radius, Math.abs(posX - staticPFPoses[targetPF].x), Math.abs(posZ - staticPFPoses[targetPF].z));
    let isJump = false;
    // if player is enough close to objective platfrom, jump to platform
    if (distToPF <= pf_radius && posY < staticPFPoses[targetPF].y) {
      isJump = true;
    }
    console.log("Target Pos ;" + staticPFPoses[targetPF].x + " " + staticPFPoses[targetPF].y + " " + staticPFPoses[targetPF].z);
    if ((non_mv_dir != 2) && (non_mv_dir == 1 || Math.abs(posX - staticPFPoses[targetPF].x) > Math.abs(posZ - staticPFPoses[targetPF].z))) {
      if (posX < staticPFPoses[targetPF].x) {
        this.addKeyEvent(flow, "right", isJump);
      } else if (posX > staticPFPoses[targetPF].x) {
        this.addKeyEvent(flow, "left", isJump);
      }
    } else {
      if (posZ < staticPFPoses[targetPF].z) {
        this.addKeyEvent(flow, "down", isJump);
      } else if (posZ > staticPFPoses[targetPF].z) {
        this.addKeyEvent(flow, "up", isJump);
      }
    }
    return true;
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
      "isLandscape": true
    },
    {
      "type": "navigate",
      "assertedEvents": [{
        "type": "navigation",
        "url": "https://webaverse-alan-cousin.netlify.app/",
        "title": "Jumping Test"
      }],
      "url": "https://webaverse-alan-cousin.netlify.app/",
      "timeout": 90000
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