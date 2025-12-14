// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PaymentContract
 * @dev Простой контракт для приёма произвольных платежей в ETH
 */
contract PaymentContract {
    // Владелец контракта
    address public owner;

    // Структура для хранения информации о платеже
    struct Payment {
        address sender;
        uint256 amount;
        uint256 timestamp;
    }

    // Массив всех платежей
    Payment[] public payments;

    // События
    event PaymentReceived(address indexed sender, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed owner, uint256 amount);

    // Модификатор для проверки владельца
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Конструктор устанавливает владельца контракта
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Функция для приёма платежей
     */
    function makePayment() public payable {
        require(msg.value > 0, "Payment amount must be greater than 0");

        payments.push(Payment({
            sender: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit PaymentReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Функция receive() для приёма прямых переводов ETH
     */
    receive() external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");

        payments.push(Payment({
            sender: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit PaymentReceived(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Функция fallback() для обработки вызовов без данных
     */
    fallback() external payable {
        if (msg.value > 0) {
            payments.push(Payment({
                sender: msg.sender,
                amount: msg.value,
                timestamp: block.timestamp
            }));

            emit PaymentReceived(msg.sender, msg.value, block.timestamp);
        }
    }

    /**
     * @dev Получить количество платежей
     * @return Количество платежей
     */
    function getPaymentsCount() public view returns (uint256) {
        return payments.length;
    }

    /**
     * @dev Получить информацию о платеже по индексу
     * @param index Индекс платежа
     * @return sender Адрес отправителя
     * @return amount Сумма платежа
     * @return timestamp Время платежа
     */
    function getPayment(uint256 index) public view returns (
        address sender,
        uint256 amount,
        uint256 timestamp
    ) {
        require(index < payments.length, "Payment index out of bounds");
        Payment memory payment = payments[index];
        return (payment.sender, payment.amount, payment.timestamp);
    }

    /**
     * @dev Получить все платежи (ограничено для gas оптимизации)
     * @return Массив адресов отправителей
     * @return Массив сумм
     * @return Массив временных меток
     */
    function getAllPayments() public view returns (
        address[] memory,
        uint256[] memory,
        uint256[] memory
    ) {
        uint256 count = payments.length;
        address[] memory senders = new address[](count);
        uint256[] memory amounts = new uint256[](count);
        uint256[] memory timestamps = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            senders[i] = payments[i].sender;
            amounts[i] = payments[i].amount;
            timestamps[i] = payments[i].timestamp;
        }

        return (senders, amounts, timestamps);
    }

    /**
     * @dev Получить баланс контракта
     * @return Баланс контракта в wei
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Вывести средства (только владелец)
     * @param amount Сумма для вывода
     */
    function withdraw(uint256 amount) public onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit Withdraw(owner, amount);
    }

    /**
     * @dev Вывести все средства (только владелец)
     */
    function withdrawAll() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit Withdraw(owner, balance);
    }
}

