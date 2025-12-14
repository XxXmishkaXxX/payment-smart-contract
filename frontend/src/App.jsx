import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ABI контракта (только нужные функции)
const CONTRACT_ABI = [
  "function makePayment() payable",
  "function getBalance() view returns (uint256)"
];

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Подключение к MetaMask
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          
          setProvider(provider);
          setSigner(signer);
          setAccount(address);

          if (CONTRACT_ADDRESS) {
            const contractInstance = new ethers.Contract(
              CONTRACT_ADDRESS,
              CONTRACT_ABI,
              signer
            );
            setContract(contractInstance);
          }

          setError(null);
        }
      } else {
        setError('MetaMask не установлен. Пожалуйста, установите MetaMask.');
      }
    } catch (err) {
      setError(`Ошибка подключения: ${err.message}`);
    }
  };

  // Отправка платежа
  const sendPayment = async () => {
    if (!contract || !paymentAmount) {
      setError('Введите сумму платежа');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const amount = ethers.parseEther(paymentAmount);
      const tx = await contract.makePayment({ value: amount });
      
      setSuccess(`Транзакция отправлена: ${tx.hash}`);
      
      await tx.wait();
      setSuccess(`Платеж успешно выполнен! Хеш: ${tx.hash}`);
      
      setPaymentAmount('');
      await fetchBalance();
      await fetchPayments();
    } catch (err) {
      setError(`Ошибка при отправке платежа: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Получение баланса контракта
  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/balance`);
      if (response.data.success) {
        setBalance(response.data.balanceEth);
      }
    } catch (err) {
      console.error('Ошибка при получении баланса:', err);
    }
  };

  // Получение списка платежей
  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/payments`);
      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (err) {
      console.error('Ошибка при получении платежей:', err);
    }
  };

  // Проверка изменений аккаунта в MetaMask
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          setAccount(null);
          setProvider(null);
          setSigner(null);
          setContract(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchBalance();
    fetchPayments();
    
    const interval = setInterval(() => {
      fetchBalance();
      fetchPayments();
    }, 10000); // Обновление каждые 10 секунд

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>💳 Смарт-контракт для приёма платежей</h1>
        <p>Учебный проект для работы с Ethereum смарт-контрактами</p>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="wallet-section">
        <h2>Кошелёк</h2>
        {!account ? (
          <button className="btn btn-primary" onClick={connectWallet}>
            Подключить MetaMask
          </button>
        ) : (
          <div className="wallet-info">
            <span className={`status status-connected`}>Подключено</span>
            <div>
              <strong>Адрес:</strong>
              <div className="address">{account}</div>
            </div>
          </div>
        )}
      </div>

      <div className="balance-section">
        <h2>Баланс контракта</h2>
        <div className="balance-value">{parseFloat(balance).toFixed(4)} ETH</div>
        <button className="btn btn-primary" onClick={fetchBalance} style={{ marginTop: '10px' }}>
          Обновить
        </button>
      </div>

      {account && (
        <div className="payment-section">
          <h2>Отправить платеж</h2>
          <div className="payment-form">
            <div className="input-group">
              <label>Сумма (ETH)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.1"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-success"
                onClick={sendPayment}
                disabled={loading || !paymentAmount}
              >
                {loading ? 'Отправка...' : 'Отправить платеж'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="payments-section">
        <h2>История платежей</h2>
        <button className="btn btn-primary" onClick={fetchPayments} style={{ marginTop: '10px' }}>
          Обновить
        </button>
        <div className="payments-list">
          {payments.length === 0 ? (
            <div className="loading">Платежей пока нет</div>
          ) : (
            payments.map((payment, index) => (
              <div key={index} className="payment-item">
                <div className="payment-item-header">
                  <div className="payment-address">{payment.sender}</div>
                  <div className="payment-amount">{parseFloat(payment.amountEth).toFixed(4)} ETH</div>
                </div>
                <div className="payment-date">
                  {new Date(payment.date).toLocaleString('ru-RU')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

