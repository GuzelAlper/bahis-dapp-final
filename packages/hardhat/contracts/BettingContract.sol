// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BettingContract {
    // 1. Переменные состояния (Durum Değişkenleri)
    address payable public owner;
    
    // Результат (Исход) матча. PENDING = Ожидание.
    enum Outcome { PENDING, TEAM_A_WINS, TEAM_B_WINS, DRAW }
    
    // Структура для хранения данных о ставке
    struct Bet {
        address bettor;
        uint256 amount;
        Outcome prediction; // Прогноз игрока: TEAM_A_WINS, TEAM_B_WINS, или DRAW
    }
    
    // Текущий статус матча/ставки
    Outcome public currentOutcome = Outcome.PENDING; 

    // Общая сумма ставок на каждый исход
    mapping(Outcome => uint256) public totalBetsForOutcome;

    // Массив для хранения всех сделанных ставок
    Bet[] public allBets;
    
    // 2. События (Olaylar/Events)
    event BetPlaced(address indexed bettor, uint256 amount, Outcome prediction);
    event ResultAnnounced(Outcome finalOutcome);
    event WinningsPaid(address indexed winner, uint256 amount);
    event OwnerWithdrewFunds(uint256 amount);

    // 3. Функция-конструктор (Kurucu Fonksiyon)
    constructor() {
        owner = payable(msg.sender);
    }
    
    // 4. Модификаторы (Modifiers)
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function."); // ASCII'ye çevrildi
        _;
    }

    // 5. Функции (Fonksiyonlar)
    
    // Taraf 1: Функция для размещения ставки
    function placeBet(Outcome _prediction) public payable {
        // Требования:
        require(msg.value > 0, "Amount must be greater than zero.");
        require(currentOutcome == Outcome.PENDING, "Betting is closed.");
        
        // Только ставки на конкретный исход (не PENDING)
        require(_prediction != Outcome.PENDING, "Invalid prediction.");
        
        // Создание новой ставки
        Bet memory newBet = Bet({
            bettor: msg.sender,
            amount: msg.value,
            prediction: _prediction
        });
        
        // Обновление состояния:
        allBets.push(newBet);
        totalBetsForOutcome[_prediction] += msg.value;
        
        emit BetPlaced(msg.sender, msg.value, _prediction);
    }

    // Taraf 2: Функция для объявления результата
    function announceResult(Outcome _finalOutcome) public onlyOwner {
        require(currentOutcome == Outcome.PENDING, "Result already announced.");
        require(_finalOutcome != Outcome.PENDING, "Invalid final outcome.");

        currentOutcome = _finalOutcome;
        emit ResultAnnounced(_finalOutcome);

        // Вызов функции распределения выигрышей после объявления результата
        distributeWinnings(_finalOutcome);
    }

    // Внутренняя функция для распределения выигрышей
    function distributeWinnings(Outcome _winningOutcome) internal {
        uint256 totalWinningPool = totalBetsForOutcome[_winningOutcome];
        
        // Если победителей нет, просто оставляем средства в контракте (или переводим владельцу)
        if (totalWinningPool == 0) {
            return;
        }

        // 1. Рассчитываем и выплачиваем выигрыши
        for (uint i = 0; i < allBets.length; i++) {
            Bet storage bet = allBets[i];
            
            if (bet.prediction == _winningOutcome) {
                // Если ставка совпадает с результатом, рассчитываем долю выигрыша
                uint256 winningShare = (bet.amount * address(this).balance) / totalWinningPool;
                
                // Выплата (transfer/send/call)
                (bool success, ) = bet.bettor.call{value: winningShare}("");
                require(success, "Transfer failed.");
                
                emit WinningsPaid(bet.bettor, winningShare);
            }
        }
    }

    // Taraf 3: Функция для вывода излишних средств (для безопасности)
function withdrawFunds() public onlyOwner {
    // Çekilecek miktarı (kontratın tamamı) değişkene atıyoruz
    uint256 balanceToWithdraw = address(this).balance; 
    
    // Yetersiz bakiye kontrolü (opsiyonel ama iyi bir uygulama)
    require(balanceToWithdraw > 0, "No funds to withdraw."); 
    
    // Çekme işlemi
    (bool success, ) = owner.call{value: balanceToWithdraw}("");
    require(success, "Withdrawal failed.");
    
    // Olayı (Event) yayınlama
    emit OwnerWithdrewFunds(balanceToWithdraw);
}

    // Позволяет получить баланс контракта
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}