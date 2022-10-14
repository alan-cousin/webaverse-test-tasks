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
 * playerPos.x:X-coordinate,playerPos.y:Y-coordinate,playerPos.z:Z-coordinate,
 * @type : {x:number, y:number, z:number}
 */
let playerPos = {
  x: 0,
  y: 19,
  z: 200
};

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
let playerPosElement = {};

/**
 * used to scrap Player's position data
 * @type : UI Element
 */
let pfPosElements = {};

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
let pfPoses = [];

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
  },
  {
    "type": "keyDown",
    "target": "main",
    "key": "b"
  },
  {
    "type": "keyUp",
    "target": "main",
    "key": "b"
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
//await page.goto('http://localhost:8000/')


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

    console.log("Player Position ->", playerPos.x, playerPos.y, playerPos.z);
  }

  async afterEachStep(step, flow) {

    await super.afterEachStep(step, flow);

    // after navigate url, get UI Element
    if (step.type == "navigate") {
      playerPosElement = await page.$("#position")
      highestElement = await page.$("#highest");
      pfPosElements = await page.$("#Platform");
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
    const posOldX = playerPos.x;
    const posOldY = playerPos.y;
    const posOldZ = playerPos.z;
    console.log("Old Position ->", posOldX, posOldY, posOldZ);
    /// read position info of game player
    const posContent = await (await playerPosElement.getProperty('textContent')).jsonValue()
    const positionAfter = posContent.split(" ");
    playerPos.x = parseFloat(positionAfter[1]);
    playerPos.y = parseFloat(positionAfter[2]);
    playerPos.z = parseFloat(positionAfter[3]);
    console.log("Player Position ->", playerPos.x, playerPos.y, playerPos.z);

    const pfContent = await (await pfPosElements.getProperty('textContent')).jsonValue();

    const pfPosArray = pfContent.split(" ");
    pfPoses = [];
    for (let i = 0; i < pfPosArray.length; i++) {
      if (pfPosArray[i] != '')
        pfPoses.push(parseFloat(pfPosArray[i]));
    }
    console.log(pfPoses);
    if (taskID == 1) {

      step.key == 'w' && test("'W' key movement test", () => {
        expect(posOldZ).to.be.greaterThan(playerPos.z);
      });
      step.key == 's' && test("'S' key movement test.", () => {
        expect(playerPos.z).to.be.greaterThan(posOldZ);
      });
      step.key == 'a' && test("'A' key movement test", () => {
        expect(posOldX).to.be.greaterThan(playerPos.x);
      });
      step.key == 'd' && test("'D' key movement test", () => {
        expect(playerPos.x).to.be.greaterThan(posOldX);
      });

      (Date.now() - lastJump > timeLimit) && (jumpCount = 0);
      (step.key == ' ' && jumpCount >= 1) && test("Double Jumping test.", () => {
        expect(playerPos.y).to.be.greaterThan(posOldY)
        jumpCount++;
        lastJump = Date.now();
      });
      (step.key == ' ' && jumpCount < 1) && test("Jumping test.", () => {
        expect(playerPos.y).to.be.greaterThan(posOldY)
        jumpCount++;
        lastJump = Date.now();
      });
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

        this.move(flow);
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
  addKeyEvent(flow, direction, isJump, isDown) {
    switch (direction) {
      case "stop":
        isDown ? flow.steps.push(moveSteps[10]) : flow.steps.push(moveSteps[11]);
        break;
      case "left":
        isDown ? flow.steps.push(moveSteps[0]) : flow.steps.push(moveSteps[1]);
        break;
      case "right":
        isDown ? flow.steps.push(moveSteps[2]) : flow.steps.push(moveSteps[3]);
        break;
      case "up":
        isDown ? flow.steps.push(moveSteps[4]) : flow.steps.push(moveSteps[5]);
        break;
      case "down":
        isDown ? flow.steps.push(moveSteps[6]) : flow.steps.push(moveSteps[7]);
        break;
      case "wait":
        isDown ? flow.steps.push(moveSteps[12]) : flow.steps.push(moveSteps[13]);
        break;
      case "jump":
        isDown ? flow.steps.push(moveSteps[8]) : flow.steps.push(moveSteps[9]);
        break;

    }
  }

  /**
   * check whether player has target platform or not
   * @returns boolean
   */
  hasTarget() {
    if (targetPF < 0 || targetPF >= 4) {
      return false;
    }

    return true;
  }
  /**
   * Check player can jump to target platform at current position
   */
  isJumpable() {
    if (pfPoses[targetPF * 3 + 1] - playerPos.y > 210) {
      return false;
    }
    const x_dist = pfPoses[targetPF * 3] - playerPos.x;
    const y_dist = pfPoses[targetPF * 3 + 2] - playerPos.z;

    if (Math.sqrt(x_dist * x_dist + y_dist * y_dist) < 80) {
      return true;
    }
    return false;
  }
  /**
   * check player can go to current target platform or not
   */
  isApproachableTF() {
    // if player is too high
    if (pfPoses[targetPF * 3 + 1] - playerPos.y < 210)
      return true;
    return false;
  }
  /**
   * check whether player stand on taget platform or not
   */
  isPlayerOnTF() {
    if (this.hasTarget()) {
      if (playerPos.x < pfPoses[targetPF * 3] - pfDefautSize.x / 2 || playerPos.x > pfPoses[targetPF * 3] + pfDefautSize.x / 2)
        return false;
      if (playerPos.z < pfPoses[targetPF * 3 + 2] - pfDefautSize.z / 2 || playerPos.z > pfPoses[targetPF * 3 + 2] + pfDefautSize.z / 2)
        return false;
      if (playerPos.y >= pfPoses[targetPF * 3 + 1] + pfDefautSize.y / 2)
        return true;
    }
    return false;
  }
  /**
   * check whether player stand on centre of platform
   * @returns boolean :
   */
  isCentreOfPF() {
    if (playerPos.x < pfPoses[targetPF * 3] - 20 || playerPos.x > pfPoses[targetPF * 3] + 20)
      return false;
    if (playerPos.z < pfPoses[targetPF * 3 + 2] - 20 || playerPos.z > pfPoses[targetPF * 3 + 2] + 20)
      return false;
    if (playerPos.y >= pfPoses[targetPF * 3 + 1] + pfDefautSize.y / 2)
      return true;
    return false;
  }
  findNextTarget() {
    let i = 0;
    for (i = 0; i < pfPoses.length / 3; i++) {
      if (playerPos.y < pfPoses[i * 3 + 1])

        return i;
    }
    return i;
  }
  /**
   * 
   */
  endMove() {
    console.log("endMove : ");
    taskID++;
  }
  /**
   * 
   */
  waitForNextStep(flow) {
    console.log("Target : ", targetPF);

    this.addKeyEvent(flow, "wait", false, true);
    this.addKeyEvent(flow, "wait", false, false);
  }
  /**
   * add move key event to flow
   * @param {} flow 
   */
  moveToNearPF(flow) {
    if (playerPos.x < (pfPoses[targetPF * 3] - pfDefautSize.x / 2)) {
      this.addKeyEvent(flow, "right", false, true);
      this.addKeyEvent(flow, "right", false, false);

    } else if (playerPos.x > (pfPoses[targetPF * 3] + pfDefautSize.x / 2)) {
      this.addKeyEvent(flow, "left", false, true);
      this.addKeyEvent(flow, "left", false, false);
    }
    if (playerPos.z < (pfPoses[targetPF * 3 + 2] - pfDefautSize.z / 2)) {
      this.addKeyEvent(flow, "down", false, true);
      this.addKeyEvent(flow, "down", false, false);
    } else if (playerPos.z > (pfPoses[targetPF * 3 + 2] + pfDefautSize.z / 2)) {
      this.addKeyEvent(flow, "up", false, true);
      this.addKeyEvent(flow, "up", false, false);
    }
  }

  moveToCentreTPF(flow) {

    if (playerPos.x < pfPoses[targetPF * 3]) {
      this.addKeyEvent(flow, "right", false, true);
      this.addKeyEvent(flow, "right", false, false);

    } else if (playerPos.x > pfPoses[targetPF * 3]) {
      this.addKeyEvent(flow, "left", false, true);
      this.addKeyEvent(flow, "left", false, false);
    }

    if (playerPos.z < pfPoses[targetPF * 3 + 2]) {
      this.addKeyEvent(flow, "down", false, true);
      this.addKeyEvent(flow, "down", false, false);
    } else if (playerPos.z > pfPoses[targetPF * 3 + 2]) {
      this.addKeyEvent(flow, "up", false, true);
      this.addKeyEvent(flow, "up", false, false);
    }
  }
  /**
   * add jump key event to flow
   * @param {*} flow 
   */
  jumpToTarget(flow) {
    this.addKeyEvent(flow, "jump", false, true);
    this.addKeyEvent(flow, "jump", false, false);
    this.addKeyEvent(flow, "jump", false, true);
    this.addKeyEvent(flow, "jump", false, false);
    if (playerPos.x < pfPoses[targetPF * 3]) {
      this.addKeyEvent(flow, "right", false, true);
      this.addKeyEvent(flow, "right", false, true);
      this.addKeyEvent(flow, "right", false, true);
      this.addKeyEvent(flow, "right", false, false);
    } else if (playerPos.x > pfPoses[targetPF * 3]) {
      this.addKeyEvent(flow, "left", false, true);
      this.addKeyEvent(flow, "left", false, true);
      this.addKeyEvent(flow, "left", false, true);
      this.addKeyEvent(flow, "left", false, false);
    }

    if (playerPos.z < pfPoses[targetPF * 3 + 2]) {
      this.addKeyEvent(flow, "down", false, true);
      this.addKeyEvent(flow, "down", false, true);
      this.addKeyEvent(flow, "down", false, true);
      this.addKeyEvent(flow, "down", false, false);
    } else if (playerPos.z > pfPoses[targetPF * 3 + 2]) {
      this.addKeyEvent(flow, "up", false, true);
      this.addKeyEvent(flow, "up", false, true);
      this.addKeyEvent(flow, "up", false, true);
      this.addKeyEvent(flow, "up", false, false);
    }
  }

  /**
   * check whether player stand on boundary of Platform or not
   * @returns boolean
   */
  isOnBoundary() {
    if (targetPF < 1)
      return false;
    const currentPF = targetPF - 1;
    const dist_x = pfDefautSize.x - Math.abs(pfPoses[currentPF * 3] - playerPos.x);
    const dist_z = pfDefautSize.z - Math.abs(pfPoses[currentPF * 3 + 2] - playerPos.z);
    if (dist_x > 0 && dist_x < 5)
      return true;
    if (dist_z > 0 && dist_z < 5)
      return true;
    return false;
  }

  /**
   * Move To Target
   */
  move(flow) {

    // if player stand on Target Platfrom
    if (this.isPlayerOnTF()) {
      console.log(" player stand on Target Platfrom : target " + targetPF);
      // if player stand on centre of Target Platform
      if (this.isCentreOfPF()) {
        console.log(" player stand on center of Target Platfrom");
        // Find Next Target
        targetPF = this.findNextTarget();
        console.log("targetPF : " + targetPF);
        // if Target Platform is valid
        if (targetPF < 4) {
          this.waitForNextStep(flow);
        } else {
          this.endMove();
        }
      } else {
        // Move To Centre of Target Platform
        console.log(" Move To Centre of Target Platform");
        this.moveToCentreTPF(flow);
      }
    } else {
      console.log(" player dont't stand on Target Platfrom");
      // if player has target
      if (this.hasTarget()) {
        console.log(" Target Platform is " + targetPF);
        // if Taraget Platform is approachable 
        if (this.isApproachableTF()) {
          console.log(" Target Platform is approachable");
          // if Target Platform is near to jump
          if (this.isJumpable()) {
            console.log(" Target Platform is near to jump");
            // Jump to Target
            this.jumpToTarget(flow);
          } else {
            console.log(" Target Platform is far to jump");
            // if player stand on boundary of Platform
            if (this.isOnBoundary()) {
              console.log(" player stand on boundary of Platform");
              // wait for Target 
              this.waitForNextStep(flow);
            } else {
              console.log(" player should move to Target");
              // Move to Jumpable(nearest) Position

              this.moveToNearPF(flow);
            }
          }
        } else {
          console.log(" Target Platform is not approachable ");
          // Find Next Target
          targetPF = this.findNextTarget();
          this.waitForNextStep(flow);
        }
      } else {
        console.log(" player has not Target Platfrom");
        // Find Next Target
        targetPF = this.findNextTarget();
        this.waitForNextStep(flow);
      }
    }

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
      /*"assertedEvents": [{
        "type": "navigation",
        "url": "https://webaverse-alan-cousin.netlify.app/",
        "title": "Jumping Test"
      }],*/
      "url": "https://webaverse-alan-cousin.netlify.app/",
      "timeout": 0,
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
      "key": "a"
    },
    {
      "type": "keyDown",
      "target": "main",
      "key": "a"
    },
    {
      "type": "keyDown",
      "target": "main",
      "key": "a"
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
      "key": "w"
    },
    {
      "type": "keyDown",
      "target": "main",
      "key": "w"
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
      "type": "keyDown",
      "target": "main",
      "key": "s"
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
      "type": "keyDown",
      "target": "main",
      "key": "d"
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