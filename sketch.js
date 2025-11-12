let questionTable;
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
// *** 修改點 1: score 初始值為 0 (保持不變) ***
let score = 0; 
// 遊戲狀態: START, QUESTION, FEEDBACK (答對錯提示), SUMMARY (答案總結, 有下一題按鈕), RESULT
let gameState = 'START'; 

// --- 特效與動畫相關變數 ---
let answerButtons = [];
let startButton, restartButton;
let nextButton; // 下一題按鈕
let particles = []; // 背景/爆炸/下雨/星星粒子 共用
let trailParticles = []; // 游標殘影粒子
let feedbackMessage = '';
let feedbackColor;
let feedbackTimer = 0; // 重新啟用計時器，用於短暫顯示 FEEDBACK 畫面
let resultAnimationTimer = 0; // 紀錄結果畫面的動畫時間
let summaryText = ''; // 新增：用於儲存總結畫面要顯示的文字

// --- 動畫狀態 ---
let resultEffect = 'NONE'; // 'FIREWORKS', 'STAR', 'RAIN', 'X_MARK'
let canvas; // 儲存畫布物件，用於定位

function preload() {
  // 載入 CSV 檔案
  questionTable = loadTable('questions.csv', 'csv');
}

function setup() {
  // 畫布寬高佔視窗 80% 寬, 90% 高
  let canvasW = windowWidth * 0.8;
  let canvasH = windowHeight * 0.9;
  canvas = createCanvas(canvasW, canvasH); 
  
  // 將畫布置中
  centerCanvas(); 
  
  rectMode(CORNER); 
  processData();
  setupButtons();
  setupParticles(); // 初始化背景粒子
  startGame();
  frameRate(60); 
}

// 計算畫布居中位置並設定
function centerCanvas() {
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  canvas.position(x, y);
}

function windowResized() {
    // 畫布寬高佔視窗 80% 寬, 90% 高
    let canvasW = windowWidth * 0.8;
    let canvasH = windowHeight * 0.9;
    resizeCanvas(canvasW, canvasH);
    
    // 重新居中畫布
    centerCanvas();
    
    setupButtons(); 
    particles = []; 
    setupParticles(); 
}

function draw() {
  // 背景使用透明度，讓游標殘影特效更明顯
  background(255, 192, 203, 150); // RGB：淺粉紅色 (Pink)，透明度 150
  
  // 處理結果動畫的粒子
  if (gameState === 'RESULT') {
    resultAnimationTimer++;
    drawResultEffect(resultEffect); // 繪製主動畫效果 (如叉叉)
  } else {
    // 繪製背景粒子和互動粒子
    drawParticles(); 
  }
  
  // 繪製游標殘影 (滑鼠特效)
  drawTrailParticles();
  
  // 根據不同的遊戲狀態繪製不同畫面
  switch (gameState) {
    case 'START':
      drawStartScreen();
      break;
    case 'QUESTION':
      drawQuestionScreen();
      break;
    case 'FEEDBACK':
      drawFeedbackScreen(); // 短暫顯示答對/錯提示
      break;
    case 'SUMMARY': // 答案總結畫面
      drawSummaryScreen();
      break;
    case 'RESULT':
      // 確保粒子更新在結果畫面繪製前
      if (resultEffect === 'FIREWORKS' || resultEffect === 'RAIN' || resultEffect === 'STAR') {
        drawParticles(); 
      }
      drawResultScreen();
      break;
  }
}

// ---------------------------------
// 遊戲流程函數
// ---------------------------------

function processData() {
  for (let row of questionTable.getRows()) {
    allQuestions.push({
      question: row.getString(0),
      opA: row.getString(1),
      opB: row.getString(2),
      opC: row.getString(3),
      opD: row.getString(4),
      correct: row.getString(5) 
    });
  }
}

function setupButtons() {
  // 調整開始/重新開始按鈕寬度以配合新的比例
  startButton = { x: width / 2 - width * 0.15, y: height / 2 + 50, w: width * 0.3, h: 60, text: '開始測驗' };
  restartButton = { x: width / 2 - width * 0.15, y: height / 2 + 150, w: width * 0.3, h: 60, text: '重新開始' };
  
  // 下一題按鈕 (位於總結畫面的底部中央)
  nextButton = { x: width / 2 - width * 0.15, y: height * 0.75, w: width * 0.3, h: 60, text: '下一題 / 看結果' };

  answerButtons = [];
  
  // 1. 定義總左右邊距 (例如 5% 寬度)
  let marginX = width * 0.05; 
  // 2. 定義兩個按鈕之間的間距 (例如 4% 寬度)
  let gapX = width * 0.04;
  // 3. 計算按鈕寬度: (畫布寬 - 2*邊距 - 1*間距) / 2
  let btnW = (width - (2 * marginX) - gapX) / 2;
  
  // 4. 定義按鈕高度和垂直間距
  let btnH = height * 0.12;
  let gapY = height * 0.03;
  
  // 5. 設定起始 Y 座標
  let startY = height * 0.5;

  // 計算座標
  let x1 = marginX; // 左欄按鈕的 X 座標
  let x2 = marginX + btnW + gapX; // 右欄按鈕的 X 座標

  // A (左上)
  answerButtons.push({ x: x1, y: startY, w: btnW, h: btnH, option: 'A' });
  // B (右上)
  answerButtons.push({ x: x2, y: startY, w: btnW, h: btnH, option: 'B' });
  // C (左下)
  answerButtons.push({ x: x1, y: startY + btnH + gapY, w: btnW, h: btnH, option: 'C' });
  // D (右下)
  answerButtons.push({ x: x2, y: startY + btnH + gapY, w: btnW, h: btnH, option: 'D' });
}

function startGame() {
  // *** 修改點 2: score 仍為 0，計分邏輯在 checkAnswer 中實現 ***
  score = 0; 
  currentQuestionIndex = 0;
  resultAnimationTimer = 0; 
  resultEffect = 'NONE';
  particles = []; 
  setupParticles(); 
  quizQuestions = shuffle(allQuestions).slice(0, 5);
  gameState = 'START';
}

function checkAnswer(selectedOption) {
  let q = quizQuestions[currentQuestionIndex];
  let correctOption = q.correct;

  if (selectedOption === correctOption) {
    // *** 修改點 3: 答對加 20 分 (一題 20 分) ***
    score += 20; 
    feedbackMessage = '✔ 叮咚叮咚!答對了！'; 
    feedbackColor = color(0, 200, 100, 220); 
    createExplosionParticles(mouseX, mouseY, 30, color(255, 255, 0));
    summaryText = `【答對】 正確答案是 ${correctOption}. ${q['op' + correctOption]}`;
  } else {
    feedbackMessage = `✖ 叭叭你答錯了...`;
    feedbackColor = color(200, 50, 50, 220); 
    createExplosionParticles(mouseX, mouseY, 20, color(255, 0, 0));
    summaryText = `【答錯】 正確答案是 ${correctOption}. ${q['op' + correctOption]}`;
  }

  gameState = 'FEEDBACK';
  feedbackTimer = 60; // 短暫顯示 1 秒 (60 幀)
}

function nextStepFromSummary() {
  currentQuestionIndex++;
  if (currentQuestionIndex >= quizQuestions.length) { 
    // 這是最後一題，準備跳到結果畫面
    // 根據分數決定結果效果，並更新按鈕文本
    // 總分 100 分，60 分及格 (3 題)
    if (score === 100) {
      resultEffect = 'FIREWORKS'; 
    } else if (score >= 60) { // 3 題或以上
      resultEffect = 'STAR'; 
    } else if (score >= 20) {  // 1 題或 2 題
      resultEffect = 'RAIN'; 
    } else {  // 0 分
      resultEffect = 'X_MARK'; 
    }
    
    particles = []; 
    gameState = 'RESULT';
    nextButton.text = '下一題 / 看結果'; // 重設按鈕文字
  } else {
    // 還有下一題
    gameState = 'QUESTION';
    nextButton.text = '下一題 / 看結果';
  }
}

function getFeedbackText() {
  if (score === 100) return '👑 哇哇哇你好棒，獲得滿分 100 分！'; 
  if (score >= 80) return '👍 非常好！只差一點點就滿分了！'; 
  if (score >= 60) return '💪 恭喜及格！這都是很基本的題目喔，請再接再厲！'; 
  if (score >= 20) return '🥺 至少答對了！但可以再努力點！';
  return '😭 亞洲父母表示這麼簡單的問題都不會？'; 
}

// ---------------------------------
// 畫面繪製函數
// ---------------------------------

function drawStartScreen() {
  textAlign(CENTER, CENTER);
  fill(50); 
  
  // 文字比例
  textSize(width * 0.045); 
  text('p5.js 題庫測驗', width / 2, height / 2 - height * 0.15);
  
  // 文字比例
  textSize(width * 0.02); 
  text(`從 ${allQuestions.length} 題中隨機抽取 5 題 (每題 20 分)`, width / 2, height / 2 - height * 0.05);

  drawButton(startButton);
}

function drawQuestionScreen() {
  if (quizQuestions.length === 0) return; 

  let q = quizQuestions[currentQuestionIndex];

  push();
  textAlign(CENTER, TOP);
  fill(50); 
  
  // 第幾題顯示 (置中)
  textSize(width * 0.025); 
  text(`第 ${currentQuestionIndex + 1} 題 / 5 題 (當前得分: ${score} 分)`, width / 2, height * 0.05); 
  
  // *** 關鍵修正：確保問題文本置中 ***
  
  // 1. 設定文字大小
  textSize(width * 0.03); 
  
  // 2. 計算文字區域 (與按鈕邊界一致)
  let textMarginX = width * 0.05; 
  let textWidth = width - 2 * textMarginX;
  
  // 3. 設置對齊方式為 CENTER
  textAlign(CENTER, TOP); 
  
  // 4. 繪製文字。
  text(q.question, textMarginX, height * 0.15, textWidth, height * 0.25); 
  pop();

  for (let btn of answerButtons) {
    let optionText;
    if (btn.option === 'A') optionText = 'A. ' + q.opA;
    if (btn.option === 'B') optionText = 'B. ' + q.opB;
    if (btn.option === 'C') optionText = 'C. ' + q.opC;
    if (btn.option === 'D') optionText = 'D. ' + q.opD;
    
    drawButton(btn, optionText);
  }
}

function drawFeedbackScreen() {
  fill(feedbackColor);
  rect(0, 0, width, height); 

  textAlign(CENTER, CENTER);
  fill(255); 
  
  // 文字比例
  textSize(width * 0.05); 
  text(feedbackMessage, width / 2, height / 2);

  feedbackTimer--;
  if (feedbackTimer <= 0) {
    gameState = 'SUMMARY'; // 短暫延遲後跳轉到總結畫面
    // 在總結畫面，檢查是否為最後一題，決定按鈕文字
    if (currentQuestionIndex === quizQuestions.length - 1) {
        nextButton.text = '查看最終成績';
    } else {
        nextButton.text = '下一題';
    }
  }
}

// 答案總結畫面 (已加入自動換行)
function drawSummaryScreen() {
    // 繪製半透明背景，保持背景粒子可見
    fill(255, 192, 203, 100); 
    rect(0, 0, width, height);

    textAlign(CENTER, CENTER);
    fill(50);
    
    // 標題
    textSize(width * 0.04);
    text('答案解析', width / 2, height * 0.25);
    
    // 總結文字
    textSize(width * 0.03);
    fill(200, 50, 100); // 紅色系
    
    // 使用 text(string, x, y, w, h) 實現自動換行
    let textMarginX = width * 0.1; 
    let textWidth = width - 2 * textMarginX;
    
    text(summaryText, textMarginX, height * 0.4, textWidth, height * 0.3);

    // 繪製「下一題」按鈕
    drawButton(nextButton);
}


function drawResultScreen() {
  textAlign(CENTER, CENTER);
  fill(50); 
  
  // 文字比例
  textSize(width * 0.04); 
  text('測驗結束！', width / 2, height * 0.25);

  // *** 修改點 4: 顯示最終分數 (score) 和答對題數 (score / 20) ***
  // 文字比例
  textSize(width * 0.035); 
  text(`你的最終得分: ${score} / 100`, width / 2, height * 0.45);
  // 顯示答對題數 (可選，但有助於理解)
  let correctCount = score / 20;
  textSize(width * 0.025);
  text(`答對題數: ${correctCount} / 5 題`, width / 2, height * 0.53);


  // 文字比例
  textSize(width * 0.02); 
  fill(200, 150, 0); 
  text(getFeedbackText(), width / 2, height * 0.65);

  drawButton(restartButton);
}

// ---------------------------------
// 互動與輔助函數
// ---------------------------------

function drawButton(btn, customText = btn.text) {
  let isHover = isMouseOver(btn);
  let isPressed = isHover && mouseIsPressed && (gameState === 'QUESTION' || gameState === 'START' || gameState === 'RESULT' || gameState === 'SUMMARY'); // 容許在 SUMMARY 狀態下按下

  push(); 
  rectMode(CORNER); 

  let offsetX = 0;
  let offsetY = 0;
  let textColor = color(50);
  let baseColor = color(255, 150, 180, 200); // 預設色
  let hoverColor = color(255, 100, 150); // 懸停色
  let pressColor = color(200, 80, 120); // 按下色

  // 特別處理 SUMMARY 狀態下的下一題按鈕顏色
  if (btn === nextButton && gameState === 'SUMMARY') {
    baseColor = color(255, 255, 0, 200); // 顯眼的黃色
    hoverColor = color(255, 220, 0); 
    pressColor = color(200, 170, 0);
    textColor = color(50);
  }


  if (isPressed) {
    fill(pressColor); 
    offsetX = 2; 
    offsetY = 2;
    noStroke();
    cursor(HAND);
    if (btn !== nextButton) textColor = color(255); // 非下一題按鈕按下時文字變白
  } else if (isHover) {
    fill(hoverColor); 
    stroke(255, 50, 100);
    strokeWeight(2);
    cursor(HAND); 
  } else {
    fill(baseColor); 
    noStroke();
  }
  rect(btn.x + offsetX, btn.y + offsetY, btn.w, btn.h, 10); 

  // 繪製文字
  fill(textColor); 
  // 文字比例
  textSize(width * 0.018); 
  
  if (gameState === 'QUESTION') {
    // 選項按鈕：左對齊，並在按鈕內部留出邊距
    textAlign(LEFT, CENTER);
    let padding = btn.w * 0.05;
    text(customText, btn.x + offsetX + padding, btn.y + offsetY, btn.w - padding * 2, btn.h);
  } else {
    // 開始/重新開始/下一題按鈕：居中對齊
    textAlign(CENTER, CENTER);
    text(customText, btn.x + offsetX, btn.y + offsetY, btn.w, btn.h); 
  }
  
  pop(); 
}

function isMouseOver(btn) {
  return (mouseX > btn.x && mouseX < btn.x + btn.w &&
          mouseY > btn.y && mouseY < btn.y + btn.h);
}

function mousePressed() {
  cursor(ARROW);

  if (gameState === 'START') {
    if (isMouseOver(startButton)) {
      gameState = 'QUESTION';
      return;
    }
  } else if (gameState === 'QUESTION') {
    for (let btn of answerButtons) {
      if (isMouseOver(btn)) {
        checkAnswer(btn.option);
        return;
      }
    }
  } else if (gameState === 'SUMMARY') { // 處理在 SUMMARY 狀態下點擊下一題按鈕
    if (isMouseOver(nextButton)) {
      nextStepFromSummary();
      return;
    }
  } else if (gameState === 'RESULT') {
    if (isMouseOver(restartButton)) {
      startGame();
      return;
    }
  }
}


// ---------------------------------
// 互動視覺效果 (粒子與動畫)
// ---------------------------------

// 背景粒子
function setupParticles() {
  particles = []; 
  let numParticles = floor((width * height) / 8000);  
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle(random(width), random(height), random(-0.5, 0.5), random(-0.5, 0.5), random(2, 5), random(50, 150), color(255), false, 'BACKGROUND'));
  }
}

// 滑鼠殘影特效 (新增)
function drawTrailParticles() {
  // 每幀新增一個粒子
  trailParticles.push({
    x: mouseX,
    y: mouseY,
    r: 10,
    alpha: 255,
    color: color(255, 200, 220, 255) // 淺粉色
  });

  // 更新和繪製粒子
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    let p = trailParticles[i];
    p.r *= 0.95;
    p.alpha -= 10;

    if (p.alpha <= 0 || p.r < 1) {
      trailParticles.splice(i, 1); 
      continue;
    }

    noStroke();
    p.color.setAlpha(p.alpha);
    fill(p.color);
    ellipse(p.x, p.y, p.r * 2);
  }
}

// 點擊爆炸特效
function createExplosionParticles(x, y, count, c) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, random(-5, 5), random(-5, 5), random(5, 10), 255, c, true, 'EXPLOSION'));
  }
}

// ---------------------------------
// 粒子類別 (統一管理所有粒子行為)
// ---------------------------------

class Particle {
  constructor(x, y, vx, vy, r, alpha, c, isTemporary, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = r;
    this.alpha = alpha;
    this.color = c;
    this.isTemporary = isTemporary; 
    this.life = 60; 
    this.type = type; 
    this.g = 0.1; // 重力 (適用於煙火)
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.type === 'EXPLOSION' || this.type === 'FIREWORK') {
      this.vy += this.g; // 增加重力效果
      this.life--;
      this.alpha = map(this.life, 0, 60, 0, 255); 
      this.r *= 0.98; // 爆炸粒子逐漸縮小
    } else if (this.type === 'SHELL') {
      // 煙火炮彈向上衝，到達頂點後爆炸
      this.vy += this.g * 0.5; // 輕微重力
      // 判斷是否到達爆炸點 (頂點或畫布上方 1/4 處)
      if (this.vy >= 0 || this.y < height / 4) { 
        this.explodeFirework();
        this.life = 0; 
      }
    } else if (this.type === 'BACKGROUND') {
      // 邊界環繞
      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    } else if (this.type === 'RAIN') {
      // 下雨效果
      if (this.y > height) this.y = random(-20, 0); // 回到頂端
    } else if (this.type === 'STAR') {
      // 星星效果
      if (this.y > height) this.y = random(-20, 0); 
    }
  }

  display() {
    noStroke();
    
    // 設定顏色和透明度
    let c = color(this.color);
    c.setAlpha(this.alpha);
    fill(c);
    
    if (this.type === 'RAIN') {
      // 下雨粒子是線條
      strokeWeight(this.r);
      stroke(c);
      line(this.x, this.y, this.x, this.y + 10);
    } else if (this.type === 'STAR') {
      // 星星粒子是五角星
      push();
      translate(this.x, this.y);
      rotate(frameCount * 0.01); 
      star(0, 0, this.r / 3, this.r, 5);
      pop();
    } else {
      // 圓形粒子
      ellipse(this.x, this.y, this.r * 2);
    }
  }
  
  // 檢查粒子是否應該被移除
  isFinished() {
    return this.isTemporary && this.life <= 0;
  }

  // 爆炸函數
  explodeFirework() {
    for (let i = 0; i < 60; i++) {
      let angle = random(TWO_PI);
      let speed = random(1, 7);
      let vx = cos(angle) * speed;
      let vy = sin(angle) * speed;
      // 夢幻紫色或黃色
      let fireworkColor = random() > 0.5 ? color(150, 0, 255) : color(255, 255, 0); 
      
      particles.push(new Particle(this.x, this.y, vx, vy, random(2, 4), 255, fireworkColor, true, 'FIREWORK'));
    }
  }
}

// 繪製五角星的輔助函數
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// 統一的粒子更新與繪製
function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.display();

    if (p.isFinished()) {
      particles.splice(i, 1);
    }
  }
}


// ---------------------------------
// 結果動畫繪製 
// ---------------------------------

function drawResultEffect(effect) {
  if (effect === 'FIREWORKS') {
    // 🎆 煙火動畫 (全對 100/100)
    if (resultAnimationTimer % 40 === 0) { 
      createFirework(random(width * 0.2, width * 0.8), height);
    }
  } else if (effect === 'STAR') {
    // ⭐ 星星飄落 (60/100, 80/100)
    if (resultAnimationTimer % 20 === 0 && particles.length < 50) { 
      createStarParticle(random(width), random(-20, 0));
    }
  } else if (effect === 'RAIN') {
    // 🌧️ 下雨 (20/100, 40/100)
    if (particles.length < 100) { 
      createRainParticle(random(width), random(-20, 0));
    }
  } else if (effect === 'X_MARK') {
    // ❌ 警告叉叉 (全錯 0/100)
    push();
    translate(width / 2, height / 2);
    
    let shake = sin(resultAnimationTimer * 0.5) * 5; 
    translate(shake, shake); 
    
    let alpha = 150 + sin(resultAnimationTimer * 0.1) * 100;
    stroke(255, alpha); 
    strokeWeight(width * 0.02); 
    
    let markSize = width * 0.15;
    
    line(-markSize, -markSize, markSize, markSize);
    line(-markSize, markSize, markSize, -markSize);
    pop();
  }

  drawParticles();
}

// 輔助函數：生成煙火
function createFirework(x, y) {
  particles.push(new Particle(x, y, 0, random(-10, -15), 5, 255, color(255, 255, 255), true, 'SHELL'));
}

// 輔助函數：生成星星
function createStarParticle(x, y) {
  particles.push(new Particle(x, y, random(-0.5, 0.5), random(0.5, 1.5), random(10, 20), 255, color(255), false, 'STAR'));
}

// 輔助函數：生成下雨
function createRainParticle(x, y) {
  particles.push(new Particle(x, y, random(-0.2, 0.2), random(5, 10), random(1, 3), 255, color(255), false, 'RAIN'));
}