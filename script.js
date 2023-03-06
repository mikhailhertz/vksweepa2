const spritesheet = new Image();
const canvas = document.getElementsByTagName('canvas')[0];
const context = canvas.getContext('2d');
/**
 * При отрисовке спрайта он извлекается из картинки по координатам x, y и по размеру size
 * Формат: {
 *  size: { width, height },
 *  %sprite_name%: { x, y },
 *  %sprite_name_2%: ...
 * }
 */
const digits = { width: 13, height: 23 };
const faces = { width: 26, height: 26 };
const tiles = { width: 16, height: 16 };

const minefield = new Array(16 * 16);

let time;
let mines;
let gameOver;
let firstClick;
let interval;
const debug = false;


/**
 * Записывает в объект координаты спрайтов
 * @param {any[]} keys - названия для спрайтов 
 * @param {object} object - объект, куда запишутся координаты
 * @param {number} gap - отступы по оси x между спрайтами
 * @param {number} y - отступ по оси y до верхней грани спрайтов
 */
const initSprites = (keys, object, gap, y) => keys.forEach((key, i) => { object[key] = { x: (object.width + gap) * i, y: y } });
/**
 * Рисует спрайт по параметрам, взятым по ключу из объекта
 * @param {any} key 
 * @param {object} object 
 * @param {number} x 
 * @param {number} y 
 */
const drawSprite = (key, object, x, y) => context.drawImage(spritesheet, object[key].x, object[key].y, object.width, object.height, x, y, object.width, object.height);
/**
 * 
 * @param {number} number 
 * @param {boolean} left - в какую сторону "растет" число, если true, число будет слева от x - 123|x, если false, то справа - x|123 
 * @param {number} width - минимальное количество цифр, если в number их меньше, то дорисуются нули
 * @param {number} x 
 * @param {number} y 
 */
const drawNumber = (number, left, width, x, y) => {
    let chars = number.toString().split('');
    if (chars.length < width) {
        chars = new Array(width - chars.length).fill('0').concat(chars);
    }
    chars.forEach((char, i) => {
        const offset = left ? -(chars.length - i) * digits.width : i * digits.width;
        drawSprite(char, digits, x + offset, y);
    });
};
const drawMinefield = () => {
    minefield.forEach((tile, i) => {
        const x = (i % 16) * tiles.width;
        // 26 - высота "хедера"
        const y = 40 + Math.trunc(i / 16) * tiles.height;
        //drawSprite(tile.sprite, tiles, x, y);
        if (tile.isMined && debug) {
            drawSprite('mine', tiles, x, y);
        } else {
            drawSprite(tile.sprite, tiles, x, y);
        }
    });
};

const initMinefield = () => {
    for (let i = 0; i < 16 * 16; i++) {
        minefield[i] = { sprite: 'unknown', isMined: false };
    }
    for (let i = 0; i < 40; i++) {
        layMine();
    }
};
const layMine = () => {
    let x = Math.floor(Math.random() * 16);
    let y = Math.floor(Math.random() * 16);
    while (minefield[y * 16 + x].isMined) {
        x = Math.floor(Math.random() * 16);
        y = Math.floor(Math.random() * 16);
    }
    minefield[y * 16 + x].isMined = true;
};

const newGame = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (interval) {
        clearInterval(interval);
    }

    initMinefield();

    time = 0;
    mines = 40;
    gameOver = false;
    firstClick = true;

    drawNumber(time++, true, 1, canvas.width - 8, 0);
    drawNumber(mines, false, 2, 8, 0);
    drawSprite('smile', faces, canvas.width / 2 - faces.width / 2, 0);
    drawMinefield();

    interval = setInterval(() => drawNumber(time++, true, 1, canvas.width - 8, 0), 1000);
};
const didWin = () => !minefield.some(tile => tile.sprite === 'unknown');
const endGame = (dead) => {
    drawSprite(dead ? 'ded' : 'rad', faces, canvas.width / 2 - faces.width / 2, 0);
    gameOver = true;
    clearInterval(interval);
    interval = null;
};
const getNeighbors = (col, row) => {
    let top = row - 1;
    if (top < 0) {
        top = 0;
    }
    let bottom = row + 1;
    if (bottom > 15) {
        bottom = 15;
    }
    let left = col - 1;
    if (left < 0) {
        left = 0;
    }
    let right = col + 1;
    if (right > 15) {
        right = 15;
    }
    return {
        top: top,
        left: left,
        bottom: bottom,
        right: right
    };
};
const revealSafeTiles = (col, row) => {
    let mineCount = 0;
    const n = getNeighbors(col, row);
    for (let j = n.top; j <= n.bottom; j++) {
        for (let i = n.left; i <= n.right; i++) {
            if (minefield[j * 16 + i].isMined) {
                mineCount += 1;
            }
        }
    }
    minefield[row * 16 + col].sprite = mineCount === 0 ? 'clear' : mineCount;
    if (mineCount === 0) {
        for (let j = n.top; j <= n.bottom; j++) {
            for (let i = n.left; i <= n.right; i++) {
                if (minefield[j * 16 + i].sprite !== 'clear') {
                    revealSafeTiles(i, j);
                }
            }
        }
    }
};
const revealUnflaggedTiles = (col, row) => {
    let flagCount = 0;
    let died = false;
    const n = getNeighbors(col, row);
    for (let j = n.top; j <= n.bottom; j++) {
        for (let i = n.left; i <= n.right; i++) {
            if (minefield[j * 16 + i].sprite === 'flagged') {
                flagCount += 1;
            }
        }
    }
    if (flagCount === parseInt(minefield[row * 16 + col].sprite)) {
        for (let j = n.top; j <= n.bottom; j++) {
            for (let i = n.left; i <= n.right; i++) {
                if (minefield[j * 16 + i].sprite !== 'flagged') {
                    if (minefield[j * 16 + i].isMined) {
                        died = true;
                        minefield[j * 16 + i].sprite = 'minedet';
                    } else {
                        revealSafeTiles(i, j);
                    }
                }
            }
        }
    }
    if (died) {
        endGame(true);
        minefield.forEach(tile => {
            if (tile.isMined) {
                tile.sprite = 'mine';
            } else if (tile.sprite === 'flagged') {
                tile.sprite = 'nomine';
            }
        });
    }
};

const onFaceMouseDown = () => {
    canvas.addEventListener('mouseup', onFaceMouseUp);
    drawSprite('click', faces, canvas.width / 2 - faces.width / 2, 0);
};
const onFaceMouseUp = () => {
    canvas.removeEventListener('mouseup', onFaceMouseUp);
    newGame();
};
const flagTile = (x, y) => {
    const tile = minefield[y * 16 + x];
    switch (tile.sprite) {
        case 'unknown':
            mines -= 1;
            tile.sprite = 'flagged';
            break;
        case 'flagged':
            tile.sprite = 'question';
            break;
        case 'question':
            mines += 1;
            tile.sprite = 'unknown';
            break;
    }
    drawMinefield();
    context.clearRect(0, 0, digits.width * 2, digits.height);
    drawNumber(mines, false, 2, 8, 0);
    if (didWin()) {
        endGame(false);
    }
};
const onTileMouseDown = (x, y) => {
    const tile = minefield[y * 16 + x];
    if (tile.sprite !== 'unknown' && isNaN(tile.sprite)) {
        return;
    }
    drawSprite('woah', faces, canvas.width / 2 - faces.width / 2, 0);
    if (firstClick) {
        if (tile.isMined) {
            layMine();
            tile.isMined = false;
        }
        firstClick = false;
    }
    canvas.addEventListener('mouseup', onTileMouseUp);
};
const onTileMouseUp = ({ x, y }) => {
    const rect = canvas.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top + 26;
    x = Math.trunc(x / 16);
    y = Math.trunc(y / 16);
    const tile = minefield[y * 16 + x];

    if (tile.isMined) {
        endGame(true);
        minefield.forEach(tile => {
            if (tile.isMined) {
                tile.sprite = 'mine';
            } else if (tile.sprite === 'flagged') {
                tile.sprite = 'nomine';
            }
        });
        tile.sprite = 'minedet';
    } else {
        tile.sprite === 'unknown' ? revealSafeTiles(x, y) : revealUnflaggedTiles(x, y);
        if (didWin()) {
            endGame(false);
            drawSprite('rad', faces, canvas.width / 2 - faces.width / 2, 0);
        } else {
            drawSprite('smile', faces, canvas.width / 2 - faces.width / 2, 0);
        }
    }
    drawMinefield();
    canvas.removeEventListener('mouseup', onTileMouseUp);
};
const onMouseDown = ({ x, y, button }) => {
    const rect = canvas.getBoundingClientRect();
    x -= rect.left;
    y -= rect.top;

    // Клик в хедере
    if (y < 26) {
        // Клик по лицу
        if (canvas.width / 2 - faces.width / 2 < x && x < canvas.width / 2 + faces.width / 2) {
            onFaceMouseDown();
        }
    }
    // Клик по полю
    else {
        if (gameOver) {
            return;
        }
        y -= 26;
        x = Math.trunc(x / 16);
        y = Math.trunc(y / 16);
        if (button === 2) {
            flagTile(x, y);
        } else {
            onTileMouseDown(x, y);
        }
    }
};

spritesheet.addEventListener('load', () => {
    initSprites([1, 2, 3, 4, 5, 6, 7, 8, 9, 0], digits, 1, 0);
    initSprites(['smile', 'click', 'woah', 'rad', 'ded'], faces, 1, 24);
    initSprites(['unknown', 'clear', 'flagged', 'question', 'questionclear', 'mine', 'minedet', 'nomine'], tiles, 1, 51);
    initSprites([1, 2, 3, 4, 5, 6, 7, 8], tiles, 1, 68);

    newGame();

    canvas.addEventListener('mousedown', onMouseDown);
});
spritesheet.src = 'sprite.png';