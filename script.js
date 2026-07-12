const mapSize = 8;
let gameState = {
    currentPlayer: 1,
    fullTime: 40,
    timer: 40,
    players: {
        1: { gold: 100, dmg: 10, goldMultiplier: 1, moveRange: 1, mines: 0, pos: 0 },
        2: { gold: 100, dmg: 10, goldMultiplier: 1, moveRange: 1, mines: 0, pos: 63 }
    },
    map: []
};

let interval;

$(document).ready(function() {
    generateMap();
    startTimer();

    $("#endTurn").click(endTurn);
    $("#saveGame").click(saveGame);
    $("#loadGame").click(loadGame);
    $("#showInfo").click(showInfo);
    $("#newGame").click(resetGame);

    const bgMusic = $("#bgMusic")[0];
    const clickSound = $("#clickSound")[0];

    bgMusic.volume = 0.05;
    clickSound.volume = 0.85;

    $(document).one("click keydown", function() {
        bgMusic.play();
    });

    $(document).on("keydown", function(event) {
        if (event.key === "s") {
            saveGame();
        }

        if (event.key === "l") {
            loadGame();
        }

        if (event.key === "i") {
            showInfo();
        }
    });

    $("#bgVolume").on("input", function () {
        bgMusic.volume = $(this).val();
    });

    $(".cell").on("click", function() {
        let id = $(this).data("id");
        handleClick(id);
    });

    $("#confirmBuy").click(function() {
        let player = gameState.players[gameState.currentPlayer];

        let soldierQty= parseInt($("#buySoldier").val() >= 0 ? $("#buySoldier").val() : 0) || 0;
        let minerQty = parseInt($("#buyMiner").val() >= 0 ? $("#buyMiner").val() : 0) || 0;
        let scoutQty = parseInt($("#buyScout").val() >= 0 ? $("#buyScout").val() : 0) || 0;

        let totalCost = soldierQty * 50 + minerQty * 30 + scoutQty * 150;

        if (player.gold < totalCost) {
            alert("Not enough gold!");
            return;
        }

        player.gold -= totalCost;

        player.dmg += soldierQty * 10;
        player.goldMultiplier += minerQty * 0.1;
        player.moveRange += scoutQty;

        $("#buySoldier").val(0);
        $("#buyMiner").val(0);
        $("#buyScout").val(0);

        $("#shopPanel").addClass("hidden");
        updateStats();
        renderPlayers();
        endTurn();
    });

    $("#closeShop").click(function() {
        $("#shopPanel").addClass("hidden");
        renderPlayers();
        endTurn();
    });


    $("#confirmUpgrade").click(function() {
        let player = gameState.players[gameState.currentPlayer];
        let id = player.pos;
        let cell = gameState.map[id];

        let upgradeQty = parseInt($("#upgradeMine").val() >= 0 ? $("#upgradeMine").val() : 0) || 0;
        let totalCost = upgradeQty*50;

        if (player.gold < totalCost) {
            alert("Not enough gold!");
            return;
        }

        player.gold -= totalCost;
        cell.hp += 10 * upgradeQty;

        $(".cell").eq(id).html(`<span class="cell-text">${cell.hp} hp</span>`);

        $("#upgradeMine").val(0);

        $("#upgradePanel").addClass("hidden");
        updateStats();
        renderPlayers();
        endTurn();
    });

    $("#closeUpgrade").click(function() {
        $("#upgradePanel").addClass("hidden");
        renderPlayers();
        endTurn();
    });

    $("#saveSpeed").click(function (){
        let timer = parseInt($("#gameSpeed").val()) || 40;
        if(timer < 2){
           alert("Turn time must be atleast 2!")
        }
        else{
            gameState.fullTime = timer;
            resetTimer();
        }
    });

});

function generateMap() {
    for (let i = 0; i < mapSize ** 2; i++) {
        let cell = $("<div>").addClass("cell").attr("data-id", i);
        let type = "empty";
        let owner = 0;
        let hp = 0;

        cell.addClass("grass");

        if(i === 0) { type = "castle"; owner = 1; hp = 500; cell.removeClass("grass"); cell.addClass("castle blue"); cell.html(`<span class="cell-text">500 hp</span>`);}
        if(i === 63) { type = "castle"; owner = 2; hp = 500; cell.removeClass("grass"); cell.addClass("castle red"); cell.html(`<span class="cell-text">500 hp</span>`);}

        if(((i >= 4 && i <= 7) || (i >= 12 && i <= 15)
                || (i >= 20 && i <= 43) || (i >= 48 && i <= 51)
                || (i >= 56 && i <= 59)) && Math.random() < 0.2){
            type = "mine";
            hp = 10;
            cell.html(`<span class="cell-text">10 hp</span>`);
            cell.removeClass("grass");
            cell.addClass("mine empty");
        }

        gameState.map.push({type, owner, hp});

        $("#map").append(cell);
    }

    renderPlayers();
}

function renderPlayers() {
    $(".cell").find('img').remove();
    $(".cell").eq(gameState.players[1].pos).append('<img src="assets/images/blueplayer.png" alt="player1">');
    $(".cell").eq(gameState.players[2].pos).append('<img src="assets/images/redplayer.png" alt="player2">');
    updateStats();
}

function handleClick(id) {
    let player = gameState.currentPlayer;
    let currentPos = gameState.players[player].pos;

    if(Math.abs(Math.floor(currentPos / mapSize) - Math.floor(id / mapSize)) +
        Math.abs(currentPos % mapSize - id % mapSize) <= gameState.players[player].moveRange) {

        const clickSound = $("#clickSound")[0];
        clickSound.currentTime = 0;
        clickSound.play();

        gameState.players[player].pos = id;
        let cell = gameState.map[id];

        if(cell.type === "mine") {
            if(cell.owner !== player) {
                if(gameState.players[player].dmg >= cell.hp) {
                    gameState.players[player].mines += 1;
                    if(cell.owner !== 0){
                        gameState.players[player === 1 ? 2 : 1].mines -= 1;
                        $(".cell").eq(id).removeClass(player === 1 ? "red":"blue");
                    }
                    else{
                        $(".cell").eq(id).removeClass("empty");
                    }
                    cell.hp = 20;
                    cell.owner = player;
                    $(".cell").eq(id).html(`<span class="cell-text">${cell.hp} hp</span>`);
                    $(".cell").eq(id).addClass(player === 1 ? "blue":"red");
                }
            }
            else if(cell.owner !== 0){
                $("#upgradePanel").removeClass("hidden");
                return;
            }
        }

        if(cell.type === "castle") {
            if(cell.owner !== player) {
                if(gameState.players[player].dmg >= cell.hp){
                    alert("You win! Player " + player);
                    resetGame();
                }
                else{
                    alert("You are not built for this! Get more damage!");
                }
            } else {
                $("#shopPanel").removeClass("hidden");
                return;
            }
        }

        renderPlayers();
        endTurn();
    } else {
        alert("You can't move that far! Current movement range: " + gameState.players[player].moveRange);
    }
}

function startTimer() {
    interval = setInterval(function() {
        gameState.timer--;
        $("#timer").text(gameState.timer);
        if(gameState.timer <= 0) {
            endTurn();
        }
    }, 1000);
}

function resetTimer() {
    gameState.timer = gameState.fullTime;
    $("#timer").text(gameState.fullTime);
}

function endTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    $("#currentPlayer").text(gameState.currentPlayer);
    gameState.players[1].gold += gameState.players[1].mines * 10 * gameState.players[1].goldMultiplier;
    gameState.players[2].gold += gameState.players[2].mines * 10 * gameState.players[2].goldMultiplier;
    $("#shopPanel").addClass("hidden");
    $("#upgradePanel").addClass("hidden");
    updateStats();
    resetTimer();
}

function updateStats() {
    $("#gold_player1").text(gameState.players[1].gold);
    $("#gold_player2").text(gameState.players[2].gold);
    $("#dmg_player1").text(gameState.players[1].dmg);
    $("#dmg_player2").text(gameState.players[2].dmg);
    $("#range_player1").text(gameState.players[1].moveRange);
    $("#range_player2").text(gameState.players[2].moveRange);
    $("#multi_player1").text(gameState.players[1].goldMultiplier.toFixed(1));
    $("#multi_player2").text(gameState.players[2].goldMultiplier.toFixed(1));
    $("#mines_player1").text(gameState.players[1].mines);
    $("#mines_player2").text(gameState.players[2].mines);
}

function saveGame() {
    localStorage.setItem("goldManiaSave", JSON.stringify(gameState));
    alert("Game saved!");
}

function renderMap() {
    $(".cell").each(function(index) {
        let cellData = gameState.map[index];
        let cellDiv = $(this);

        cellDiv.removeClass("mine castle empty blue red");
        cellDiv.addClass("grass");
        cellDiv.text("");

        if(cellData.type === "castle"){
            cellDiv.removeClass("grass");
            cellDiv.addClass("castle");
            cellDiv.html(`<span class="cell-text">${cellData.hp} hp</span>`);
            if(cellData.owner === 1) cellDiv.addClass("blue");
            else cellDiv.addClass("red");
        }

        if(cellData.type === "mine") {
            cellDiv.removeClass("grass");
            cellDiv.addClass("mine");
            cellDiv.html(`<span class="cell-text">${cellData.hp} hp</span>`);
            if(cellData.owner === 0) cellDiv.addClass("empty");
            else if(cellData.owner === 1) cellDiv.addClass("blue");
            else cellDiv.addClass("red");
        }
    });
}


function loadGame() {
    let save = localStorage.getItem("goldManiaSave");
    if(save) {
        gameState = JSON.parse(save);
        renderMap();
        renderPlayers();
        $("#currentPlayer").text(gameState.currentPlayer);
        alert("Game loaded!");
    }
}

function showInfo(){
    if($("#info").hasClass("hidden")){
        $("#info").removeClass("hidden");
    }
    else{
        $("#info").addClass("hidden");
    }
}

function resetGame() {
    location.reload();
}
