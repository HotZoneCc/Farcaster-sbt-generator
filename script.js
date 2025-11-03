class SBTGenerator {
    constructor() {
        this.ethPrice = null;
        this.recipientAddress = '0x9187a235c9BF67B19C9276D874Fd493Fa7c79654';
        this.init();
    }

    async init() {
        await this.loadETHPrice();
        this.setupEventListeners();
    }

    async loadETHPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            this.ethPrice = data.ethereum.usd;
        } catch (error) {
            console.error('Failed to fetch ETH price:', error);
            // Fallback price
            this.ethPrice = 2000;
        }
    }

    setupEventListeners() {
        const form = document.getElementById('sbtForm');
        const copyBtn = document.getElementById('copyAddress');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        copyBtn.addEventListener('click', () => this.copyAddress());
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

    generateSBT(fid) {
        // Update preview
        document.getElementById('previewFid').textContent = fid;
        
        // Calculate ETH amount
        const ethAmount = (1 / this.ethPrice).toFixed(6);
        document.getElementById('ethAmount').textContent = ethAmount;

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
        this.init();
    }

    async init() {
        if (typeof window.ethereum !== 'undefined') {
            this.web3 = new Web3(window.ethereum);
            await this.checkConnection();
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
        const paymentSection = document.querySelector('.payment-details');
        if (paymentSection) {
            const web3Button = document.createElement('button');
            web3Button.textContent = 'Pay with MetaMask';
            web3Button.className = 'web3-btn';
            web3Button.style.background = '#f6851b';
            web3Button.style.marginTop = '10px';
            
            web3Button.addEventListener('click', () => this.sendPayment());
            paymentSection.appendChild(web3Button);
        }
    }

    async sendPayment() {
        if (!this.account) {
            try {
                await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                const accounts = await this.web3.eth.getAccounts();
                this.account = accounts[0];
            } catch (error) {
                this.showError('Please connect your MetaMask wallet');
                return;
            }
        }

        try {
            const ethAmount = document.getElementById('ethAmount').textContent;
            const amountInWei = this.web3.utils.toWei(ethAmount, 'ether');
            
            const transaction = {
                from: this.account,
                to: this.recipientAddress,
                value: amountInWei,
                gas: 21000
            };

            const txHash = await this.web3.eth.sendTransaction(transaction);
            this.showSuccess(`Payment sent! Transaction: ${txHash}`);
        } catch (error) {
            this.showError('Transaction failed: ' + error.message);
        }
    }

    showError(message) {
        alert('Error: ' + message);
    }

    showSuccess(message) {
        alert('Success: ' + message);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SBTGenerator();
    new Web3Payment();
});
