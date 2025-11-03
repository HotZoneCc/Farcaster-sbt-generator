class SBTGenerator {
    constructor() {
        this.ethPrice = null;
        this.recipientAddress = '0x9187a235c9BF67B19C9276D874Fd493Fa7c79654';
        this.coinmarketcapApiKey = 'e1850d4fdacb41639e2942433cd66cce';
        this.init();
    }

    async init() {
        await this.loadETHPrice();
        this.setupEventListeners();
    }

    async loadETHPrice() {
        try {
            const response = await fetch(
                'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH', 
                {
                    headers: {
                        'X-CMC_PRO_API_KEY': this.coinmarketcapApiKey,
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`CoinMarketCap API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.data && data.data.ETH && data.data.ETH.quote && data.data.ETH.quote.USD) {
                this.ethPrice = data.data.ETH.quote.USD.price;
                console.log('ETH Price:', this.ethPrice);
            } else {
                throw new Error('Invalid response format from CoinMarketCap');
            }
        } catch (error) {
            console.error('Failed to fetch ETH price from CoinMarketCap:', error);
            // Fallback: Try alternative method or use default price
            await this.loadETHPriceFallback();
        }
    }

    async loadETHPriceFallback() {
        try {
            // Fallback to a different API if CoinMarketCap fails
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            this.ethPrice = data.ethereum.usd;
        } catch (fallbackError) {
            console.error('Failed to fetch ETH price from fallback:', fallbackError);
            // Ultimate fallback price
            this.ethPrice = 2000;
        }
    }

    setupEventListeners() {
        const form = document.getElementById('sbtForm');
        const copyBtn = document.getElementById('copyAddress');
        const fidInput = document.getElementById('fid');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        copyBtn.addEventListener('click', () => this.copyAddress());
        
        // Real-time preview as user types
        fidInput.addEventListener('input', (e) => {
            const fid = e.target.value.trim();
            if (fid && fid > 0) {
                this.updatePreview(fid);
            }
        });
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const fidInput = document.getElementById('fid');
        const fid = fidInput.value.trim();

        if (!fid || fid < 1) {
            this.showError('Please enter a valid Farcaster ID');
            return;
        }

        this.generateSBT(fid);
    }

    updatePreview(fid) {
        if (this.ethPrice) {
            document.getElementById('previewFid').textContent = fid;
            const ethAmount = (1 / this.ethPrice).toFixed(6);
            document.getElementById('ethAmount').textContent = ethAmount;
        }
    }

    generateSBT(fid) {
        // Update preview
        document.getElementById('previewFid').textContent = fid;
        
        // Calculate ETH amount
        if (this.ethPrice) {
            const ethAmount = (1 / this.ethPrice).toFixed(6);
            document.getElementById('ethAmount').textContent = ethAmount;
        } else {
            document.getElementById('ethAmount').textContent = '0.000';
            this.showError('Unable to fetch current ETH price. Using estimated amount.');
        }

        // Show preview
        document.getElementById('preview').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');

        // Scroll to preview
        document.getElementById('preview').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    async copyAddress() {
        try {
            await navigator.clipboard.writeText(this.recipientAddress);
            
            const copyBtn = document.getElementById('copyAddress');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#48bb78';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            this.showError('Failed to copy address');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        document.getElementById('preview').classList.add('hidden');
    }
}

// Enhanced Web3 integration for direct payment
class Web3Payment {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.recipientAddress = '0x9187a235c9BF67B19C9276D874Fd493Fa7c79654';
        this.init();
    }

    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            await this.checkConnection();
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                this.account = accounts[0] || null;
                this.updateWeb3Button();
            });
        }
    }

    async checkConnection() {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.setupWeb3Payment();
            }
        } catch (error) {
            console.error('Error checking Web3 connection:', error);
        }
    }

    setupWeb3Payment() {
        this.updateWeb3Button();
    }

    updateWeb3Button() {
        const paymentSection = document.querySelector('.payment-details');
        const existingButton = document.querySelector('.web3-btn');
        
        if (existingButton) {
            existingButton.remove();
        }

        if (paymentSection) {
            const web3Button = document.createElement('button');
            web3Button.className = 'web3-btn';
            
            if (this.account) {
                web3Button.textContent = `Pay with ${this.account.substring(0, 6)}...${this.account.substring(38)}`;
                web3Button.style.background = '#27ae60';
            } else {
                web3Button.textContent = 'Connect MetaMask & Pay';
                web3Button.style.background = '#f6851b';
            }
            
            web3Button.style.marginTop = '10px';
            web3Button.style.width = '100%';
            
            web3Button.addEventListener('click', () => this.handlePayment());
            paymentSection.appendChild(web3Button);
        }
    }

    async handlePayment() {
        if (!this.account) {
            try {
                await this.connectWallet();
            } catch (error) {
                this.showError('Please connect your MetaMask wallet');
                return;
            }
        }

        await this.sendPayment();
    }

    async connectWallet() {
        try {
            await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            const accounts = await this.web3.eth.getAccounts();
            this.account = accounts[0];
            this.updateWeb3Button();
        } catch (error) {
            throw new Error('User rejected connection');
        }
    }

    async sendPayment() {
        try {
            const ethAmount = document.getElementById('ethAmount').textContent;
            const amountInWei = this.web3.utils.toWei(ethAmount, 'ether');
            
            const transaction = {
                from: this.account,
                to: this.recipientAddress,
                value: amountInWei,
                gas: '21000',
                gasPrice: await this.web3.eth.getGasPrice()
            };

            // Estimate gas
            try {
                const gasEstimate = await this.web3.eth.estimateGas(transaction);
                transaction.gas = gasEstimate;
            } catch (error) {
                console.warn('Gas estimation failed, using default:', error);
            }

            const txHash = await this.web3.eth.sendTransaction(transaction);
            this.showSuccess(`Payment sent! Transaction: ${txHash.substring(0, 10)}...`);
            
            // Optional: Add transaction explorer link
            this.addTransactionLink(txHash);
            
        } catch (error) {
            this.showError('Transaction failed: ' + error.message);
        }
    }

    addTransactionLink(txHash) {
        const paymentSection = document.querySelector('.payment-details');
        const existingLink = document.querySelector('.tx-link');
        
        if (existingLink) {
            existingLink.remove();
        }

        const txLink = document.createElement('a');
        txLink.className = 'tx-link';
        txLink.href = `https://etherscan.io/tx/${txHash}`;
        txLink.target = '_blank';
        txLink.rel = 'noopener noreferrer';
        txLink.textContent = 'View on Etherscan';
        txLink.style.display = 'block';
        txLink.style.marginTop = '10px';
        txLink.style.textAlign = 'center';
        txLink.style.color = '#885aff';
        txLink.style.textDecoration = 'none';
        txLink.style.fontWeight = '600';
        
        paymentSection.appendChild(txLink);
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.background = '#d4edda';
        successDiv.style.color = '#155724';
        successDiv.style.padding = '1rem';
        successDiv.style.borderRadius = '8px';
        successDiv.style.marginTop = '1rem';
        successDiv.style.textAlign = 'center';
        successDiv.textContent = message;
        
        const paymentSection = document.querySelector('.payment-section');
        paymentSection.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}

// Price updater to refresh ETH price periodically
class PriceUpdater {
    constructor(sbtGenerator) {
        this.sbtGenerator = sbtGenerator;
        this.updateInterval = 300000; // 5 minutes
        this.init();
    }

    init() {
        // Update price every 5 minutes
        setInterval(() => {
            this.sbtGenerator.loadETHPrice();
        }, this.updateInterval);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const sbtGenerator = new SBTGenerator();
    new Web3Payment();
    new PriceUpdater(sbtGenerator);
});
