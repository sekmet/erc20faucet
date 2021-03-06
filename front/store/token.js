/* eslint-disable no-console */
import { fromWei, toHex, toWei, numberToHex, hexToNumberString } from 'web3-utils'
import ABI from '@/abis/ERC20.abi.json'
import networkConfig from '@/networkConfig'

const state = () => {
  return {
    address: null,
    balance: '0',
    txs: []
  }
}

const getters = {
  tokenInstance: (state, getters, rootState, rootGetters) => async () => {
    const { ethAccount, netId } = rootState.metamask
    const { verifyingContract } = networkConfig[`netId${netId}`]
    const web3 = await rootGetters['metamask/web3']()
    return new web3.eth.Contract(ABI, verifyingContract, {
      from: ethAccount
    })
  }
}

const mutations = {
  SET_TOKEN_ADDRESS(state, address) {
    state.address = address
  },
  SET_TOKEN_BALANCE(state, balance) {
    state.balance = fromWei(balance)
  },
  ADD_TX(state, txHash) {
    state.txs.push(txHash)
  }
}

const actions = {
  async getTokenBalance({ state, getters, rootState, dispatch, commit }) {
    const { ethAccount } = rootState.metamask
    const tokenInstance = await getters.tokenInstance()
    const data = tokenInstance.methods.balanceOf(ethAccount).encodeABI()
    const callParams = {
      method: 'eth_call',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        data
      }, 'latest'],
      from: ethAccount
    }
    console.log('getTokenBalance callParams', callParams)
    let balance = await dispatch('metamask/sendAsync', callParams, { root: true })
    balance = hexToNumberString(balance)
    commit('SET_TOKEN_BALANCE', balance)
    setTimeout(() => { dispatch('getTokenBalance') }, 3000)
  },

  async getTokenAddress({ state, getters, commit }) {
    const tokenInstance = await getters.tokenInstance()
    commit('SET_TOKEN_ADDRESS', tokenInstance._address)
  },

  async mintTokens({ state, getters, rootState, rootGetters, dispatch, commit }, { to, amount }) {
    amount = amount.toString()
    const gasPrice = rootState.metamask.gasPrice.standard
    const tokenInstance = await getters.tokenInstance()
    const { ethAccount } = rootState.metamask
    const data = tokenInstance.methods.mint(to, toWei(amount)).encodeABI()
    const gas = await tokenInstance.methods.mint(to, toWei(amount)).estimateGas()
    console.log('gas mintTokens', gas)
    const callParams = {
      method: 'eth_sendTransaction',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        gas: numberToHex(gas + 100000),
        gasPrice: toHex(toWei(gasPrice.toString(), 'gwei')),
        value: 0,
        data
      }],
      from: ethAccount
    }

    console.log('mintTokens callParams', callParams)
    const txHash = await dispatch('metamask/sendAsync', callParams, { root: true })
    commit('ADD_TX', txHash)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
