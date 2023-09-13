const ethers = require("ethers")
const optimismSDK = require("@eth-optimism/sdk")
require('dotenv').config()

async function withdraw() {
    try {

        const l1Url = `https://eth-goerli.g.alchemy.com/v2/${process.env.GOERLI_ALCHEMY_KEY}`
        const l2Url = `${process.env.L2_URL}`

        const l1Provider = new ethers.providers.JsonRpcProvider(l1Url)
        const l2Provider = new ethers.providers.JsonRpcProvider(l2Url)
        const privKey = process.env.PRIVATE_KEY
        const ETHvalue = process.env.ETH_VALUE_IN_WEI
        const l1Signer = new ethers.Wallet(privKey).connect(l1Provider)
        const l2Signer = new ethers.Wallet(privKey).connect(l2Provider)

        const zeroAddr = "0x".padEnd(42, "0")
        const l1Contracts = {
            StateCommitmentChain: zeroAddr,
            CanonicalTransactionChain: zeroAddr,
            BondManager: zeroAddr,
            //DEVNET
            AddressManager: "0x8B016f48ED0AA76C8A0984FAE83429E13A90Ba76",   // Lib_AddressManager.json
            L1CrossDomainMessenger: "0xd9448dE6Cb1c52b368e092B6Ade54D39985D382a",   // Proxy__OVM_L1CrossDomainMessenger.json
            L1StandardBridge: "0x162900dEFC8cC83Ae94B815461BB5FA7d7598CB3",   // Proxy__OVM_L1StandardBridge.json
            OptimismPortal: "0x395f28246294062C2cEa739208B207d4501083B7",   // OptimismPortalProxy.json
            L2OutputOracle: "0x3E0aC9E17333DD68C4a7c5EB643Db51979953257",   // L2OutputOracleProxy.json
        }
        const bridges = {
            Standard: {
                l1Bridge: l1Contracts.L1StandardBridge,
                l2Bridge: "0x4200000000000000000000000000000000000010",
                Adapter: optimismSDK.StandardBridgeAdapter
            },
            ETH: {
                l1Bridge: l1Contracts.L1StandardBridge,
                l2Bridge: "0x4200000000000000000000000000000000000010",
                Adapter: optimismSDK.ETHBridgeAdapter
            }
        }
        let crossChainMessenger = new optimismSDK.CrossChainMessenger({
            contracts: {
                l1: l1Contracts
            },
            bridges: bridges,
            l1ChainId: 5,
            l2ChainId: 1852,
            l1SignerOrProvider: l1Signer,
            l2SignerOrProvider: l2Signer,
            bedrock: true

        })
        console.log({l1Signer, l2Signer});
        console.log({l1Provider, l2Provider});

        //----------------------------------------------------------WITHDRAW-----------------------------------------------------------------------------------

        const response = await crossChainMessenger.withdrawETH(ETHvalue)
        console.log({response});
        const logs = await response.wait();
        console.log(logs)
        console.log("entering crossChainMesseger READY_TO_PROVE")


        // this will run in background and will give Message status

        await crossChainMessenger.waitForMessageStatus(response.hash, optimismSDK.MessageStatus.READY_TO_PROVE)
        console.log("--------------wait for message status done---------------")


        await crossChainMessenger.proveMessage(response.hash)
        console.log("--------------Prove Message Done---------------")


        await crossChainMessenger.getMessageStatus(response.hash)
        console.log('MESSAGE PROVED');


        await crossChainMessenger.waitForMessageStatus(response.hash, optimismSDK.MessageStatus.READY_FOR_RELAY)


        console.log("--------------Ready for Relay----------------")


        await crossChainMessenger.finalizeMessage(response.hash)
        console.log("--------------Finalize message done---------------")


        await crossChainMessenger.waitForMessageStatus(response, optimismSDK.MessageStatus.RELAYED)
        console.log("--------------RELAYED------------------")
    } catch (err) {
        console.log({err})
    }
}

const main = async () => {
    await withdraw()
}

main().then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })