import express from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Подключение к блокчейну
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!contractAddress) {
  console.error('CONTRACT_ADDRESS не установлен в .env файле');
  process.exit(1);
}

// ABI контракта
const contractABI = [
  "function getPaymentsCount() view returns (uint256)",
  "function getPayment(uint256 index) view returns (address sender, uint256 amount, uint256 timestamp)",
  "function getAllPayments() view returns (address[] memory, uint256[] memory, uint256[] memory)",
  "function getBalance() view returns (uint256)",
  "event PaymentReceived(address indexed sender, uint256 amount, uint256 timestamp)",
  "event Withdraw(address indexed owner, uint256 amount)"
];

// Создание экземпляра контракта
const contract = new ethers.Contract(contractAddress, contractABI, provider);

/**
 * GET /payments
 * Получить список всех платежей
 */
app.get('/payments', async (req, res) => {
  try {
    const count = await contract.getPaymentsCount();
    const payments = [];

    for (let i = 0; i < Number(count); i++) {
      const payment = await contract.getPayment(i);
      payments.push({
        index: i,
        sender: payment.sender,
        amount: payment.amount.toString(),
        amountEth: ethers.formatEther(payment.amount),
        timestamp: payment.timestamp.toString(),
        date: new Date(Number(payment.timestamp) * 1000).toISOString()
      });
    }

    res.json({
      success: true,
      count: payments.length,
      payments: payments
    });
  } catch (error) {
    console.error('Ошибка при получении платежей:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /balance
 * Получить баланс контракта
 */
app.get('/balance', async (req, res) => {
  try {
    const balance = await contract.getBalance();
    res.json({
      success: true,
      balance: balance.toString(),
      balanceEth: ethers.formatEther(balance)
    });
  } catch (error) {
    console.error('Ошибка при получении баланса:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health
 * Проверка работоспособности сервера
 */
app.get('/health', async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({
      success: true,
      status: 'ok',
      blockNumber: blockNumber,
      contractAddress: contractAddress
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend сервер запущен на порту ${PORT}`);
  console.log(`Контракт: ${contractAddress}`);
  console.log(`RPC URL: ${process.env.RPC_URL || 'http://127.0.0.1:8545'}`);
});

