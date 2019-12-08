
import React , { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Clipboard,
  TouchableOpacity,
  Dimensions
} from 'react-native';

import "./shim";

const bitcoin = require("bitcoinjs-lib");
const network = bitcoin.networks.testnet;

// Initial P2SH Segwit Keypair which holds some Testnet coins
const WIF = 'cRmwTHq4FCae55w1KaCbLBjXWs4p3d9x6XtK3doAruXGuQKg5ePT'
const keyPair = bitcoin.ECPair.fromWIF(
WIF, network
);
const { address } = bitcoin.payments.p2sh({
redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: network}),
});

// Initializing transaction
const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: network });
const psbt = new bitcoin.Psbt({ network: network })
 
export default () => {
  const [senderAddress, setSenderAddress] = useState()
  const [psHex,setPsHex] = useState()
  const [receivedData, setReceivedData] = useState()
  const [transactionData, setTransactionData] = useState()

  useEffect(() => {
    this.fetchTransactionHistory(address)
  }, []);

  fetchTransactionHistory = async (btcaddress) => {
    const res = await fetch(`http://api.blockcypher.com/v1/btc/test3/addrs/${btcaddress}`)
    const response = await res.json()
    setTransactionData(response.txrefs[0])
  }   

  generateAddress = () => {
    const keyPair2 = bitcoin.ECPair.makeRandom({ network: network })
    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair2.publicKey, network: network }),
    })
    const privateKey = keyPair2.toWIF()
    setSenderAddress(address)
    // Receiver's privatekey + address for testing purposes
    Clipboard.setString(privateKey + ' BREAK ' + address)
  }
  
  makeTransaction = () => {
    psbt.addInput({
      hash: transactionData.tx_hash,
      index: transactionData.tx_output_n,
      witnessUtxo: {
        script: Buffer.from('a91450e884786198c788d8d44deef70a0fe6c63d201087', 'hex'),
        value: transactionData.value
      },
      redeemScript: p2wpkh.output
    })
    
    // Can be dynamically added, added a static value for demo purpose.
    psbt.addOutput({
      address: senderAddress,
      value: 19000
    })
    psbt.signInput(0, keyPair)
    psbt.validateSignaturesOfInput(0)
    psbt.finalizeAllInputs()
    const pshex = psbt.extractTransaction().toHex()
    setPsHex(pshex)
    // Raw transaction hex
    Clipboard.setString(pshex)  
  }

  broadcastTransation = async (hex) => {
    let response = await fetch('http://api.blockcypher.com/v1/btc/test3/txs/push', {
      method: 'POST',
      headers : {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "tx": hex,
      })
    })
    let responseData = await response.json()
    // Response received after broadcasting, on the clipboard
    Clipboard.setString(JSON.stringify(responseData))
    setReceivedData(responseData)
  }

  return (
    <View style = {{flex: 1, alignItems:'center', paddingTop: 20}}>
      <Text style = {{fontSize: 25}}>
        Simple BitcoinJS Demo 
      </Text>
      <Text style = {{marginTop: 15, fontSize: 16}}> 
        Initial P2SH Address: {'\n'}{address}{'\n'}{'\n'} 
      </Text>
      <TouchableOpacity 
        style = {style.button}
        activeOpacity = {0.5}
        onPress = {this.generateAddress}
      >
        <Text style = {style.buttonText}>
            Generate Receiver's Address
        </Text>
      </TouchableOpacity>
      <Text>
        {senderAddress ? 'Receivers Address \n' +senderAddress : null} 
      </Text>
      <TouchableOpacity 
        style = {style.button}
        activeOpacity = {0.5}
        onPress = {this.makeTransaction}
      >
        <Text style = {style.buttonText}>
            Make Transaction
        </Text>
      </TouchableOpacity>
      <Text> 
        {psHex ? 'Transaction created successfully. Try sending it!' : null}
      </Text>
      <TouchableOpacity 
        style = {style.button}
        activeOpacity = {0.5}
        onPress = {() => this.broadcastTransation(psHex)}
      >
        <Text style = {style.buttonText}>
            Broadcast Transaction
        </Text>
      </TouchableOpacity>
      <Text> 
        {receivedData ? `Successfully broadcasted. ${'\n'} Receiving hash: ${'\n'} ${receivedData.tx.hash}` : null } 
      </Text>
    </View>
  );
}

const style = StyleSheet.create({
  button: {
    marginTop: 10, 
    width: Dimensions.get('window').width/2, 
    borderRadius: 15,  
    height: '7%', 
    backgroundColor:'#00009f', 
    justifyContent:'center', 
    alignItems:'center'
  },
  buttonText: {
    fontSize: 15, 
    fontFamily:'Lato-Regular', 
    color: '#fff',
  },
})
