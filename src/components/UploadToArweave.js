import React, { useState, useEffect } from 'react'
import Arweave from 'arweave'

const NFTCard = ({ title, owner, links, description }) => {
    console.log('Links', links)
    return (
        <div
            style={{
                border: '1px solid black',
                width: '400px',
                height: '450px',
                borderRadius: '15px',
                background: 'linear-gradient(135deg, lightblue, lightcoral)',
                boxShadow: '5px 5px 15px rgba(0, 0, 0, 0.3)',
                padding: '10px',
                margin: 'auto',
                marginTop: '20px',
            }}
        >
            <h1 style={{ textAlign: 'center' }}>{title}</h1>
            <h3>Owner: {owner}</h3>
            <div>
                {links.map((link, index) => (
                    <div key={index}>
                        <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                marginRight:
                                    index < links.length - 1 ? '10px' : '0',
                            }}
                        >
                            {link.text}
                        </a>
                        <br />
                    </div>
                ))}
            </div>
            <h2>Description</h2>
            <p>{description}</p>
        </div>
    )
}

const UploadToArweave = () => {
    const [nftData, setNftData] = useState({
        title: '',
        owner: '',
        links: [{ href: '', text: '' }],
        description: '',
    })
    const [balance, setBalance] = useState('')
    const [uploadStatus, setUploadStatus] = useState('')
    const [transactionId, setTransactionId] = useState(null)
    const [fee, setFee] = useState('')
    const [data, setData] = useState(null)

    const WALLET_KEYS = process.env.REACT_APP_WALLET_KEYS
    const walletKeys = JSON.parse(WALLET_KEYS)

    useEffect(() => {
        const fetchBalance = async () => {
            const arweave = Arweave.init({
                host: 'arweave.net',
                port: 443,
                protocol: 'https',
            })

            try {
                const walletAddress = await arweave.wallets.jwkToAddress(
                    walletKeys
                )
                const balance = await arweave.wallets.getBalance(walletAddress)
                const arBalance = arweave.ar.winstonToAr(balance)
                setBalance(arBalance)
            } catch (error) {
                console.error('Error fetching balance:', error)
                setBalance('Failed to fetch balance')
            }
        }

        fetchBalance()
    }, [])

    const calculateFee = async (data) => {
        const arweave = Arweave.init({
            host: 'arweave.net',
            port: 443,
            protocol: 'https',
        })

        const transaction = await arweave.createTransaction({ data })
        setFee(arweave.ar.winstonToAr(transaction.reward))
    }

    const uploadFileToArweave = async (file) => {
        if (!file) {
            setUploadStatus('Please select a file to upload.')
            return
        }

        const arweave = Arweave.init({
            host: 'arweave.net',
            port: 443,
            protocol: 'https',
        })

        try {
            // Read the file as an ArrayBuffer
            const fileData = await file.arrayBuffer()

            // Calculate the fee for the file data
            await calculateFee(fileData)

            // Create a transaction
            const transaction = await arweave.createTransaction({
                data: fileData,
            })

            // Use the provided wallet keys for signing
            const walletKey = walletKeys
            await arweave.transactions.sign(transaction, walletKey)

            // Post the transaction
            const response = await arweave.transactions.post(transaction)

            if (response.status === 200) {
                setUploadStatus(`Success! Transaction ID: ${transaction.id}`)
                setTransactionId(transaction.id)
            } else {
                setUploadStatus(
                    `Failed to upload file to Arweave. Status: ${response.status}`
                )
            }
        } catch (error) {
            console.error('Error uploading to Arweave:', error)
            setUploadStatus(
                `Failed to upload file to Arweave: ${error.message}`
            )
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setNftData((prevData) => ({
            ...prevData,
            [name]: value,
        }))
    }

    const handleLinkChange = (index, e) => {
        const { name, value } = e.target
        const updatedLinks = [...nftData.links]
        updatedLinks[index][name] = value
        setNftData((prevData) => ({
            ...prevData,
            links: updatedLinks,
        }))
    }

    const addLink = () => {
        setNftData((prevData) => ({
            ...prevData,
            links: [...prevData.links, { href: '', text: '' }],
        }))
    }

    const generateHTMLFile = async () => {
        const htmlContent = `
        <div style="
            border: 1px solid black;
            width: 400px;
            height: 450px;
            border-radius: 15px;
            background: linear-gradient(135deg, lightblue, lightcoral);
            box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.3);
            padding: 10px;
            margin:'auto';
            margin-top:'20px';">
          <h1 style="text-align: center;">${nftData.title}</h1>
          <h3 style="text-align: center;">Owner: ${nftData.owner}</h3>
          <div style="text-align: center; display: flex; flex-direction:column; justify-content:center;">
            ${nftData.links
                .map(
                    (link) =>
                        `<div>
                        <a
                            href="${link.href}"
                            target="_blank"
                            style="margin-right: 10px;"
                        >
                            ${link.text}
                        </a>
                        <br />
                    </div>`
                )
                .join('')}
          </div>
          <div style="text-align: center;">
            <h2>Description</h2>
            <p>${nftData.description}</p>
          </div>
        </div>
    `
        const blob = new Blob([htmlContent], { type: 'text/plain' })

        uploadFileToArweave(blob)
    }

    const arweave = Arweave.init()
    useEffect(() => {
        if (transactionId) {
            async function fetchData() {
                try {
                    const transaction = await arweave.transactions.getData(
                        transactionId,
                        {
                            decode: true,
                            string: true,
                        }
                    )
                    setData(transaction)
                } catch (error) {
                    console.error('Failed to fetch data from Arweave:', error)
                }
            }

            fetchData()
        }
    }, [transactionId])

    console.log('nftData', nftData)
    return (
        <div style={{ display: 'flex' }}>
            <div className="App" style={{ width: '50vw', paddingLeft: '50px' }}>
                <h2>Enter NFT Data</h2>
                <p>AR Token Balance: {balance}</p>
                <form>
                    <div
                        style={{
                            display: 'flex',
                            marginBottom: 20,
                        }}
                    >
                        <div>
                            <label
                                style={{ fontWeight: 'bold', fontSize: '24px' }}
                            >
                                Title:{' '}
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={nftData.title}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div style={{ marginLeft: 15 }}>
                            <label
                                style={{ fontWeight: 'bold', fontSize: '24px' }}
                            >
                                Owner:{' '}
                            </label>
                            <input
                                type="text"
                                name="owner"
                                value={nftData.owner}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {nftData.links.map((link, index) => (
                        <div
                            key={index}
                            style={{ display: 'flex', marginTop: 10 }}
                        >
                            <label style={{ fontWeight: 'bold' }}>
                                Link {index + 1} Text:{' '}
                            </label>
                            <input
                                type="text"
                                name="text"
                                value={link.text}
                                onChange={(e) => handleLinkChange(index, e)}
                            />
                            <label style={{ fontWeight: 'bold' }}>
                                {' '}
                                Link {index + 1} URL:{' '}
                            </label>
                            <input
                                type="text"
                                name="href"
                                value={link.href}
                                onChange={(e) => handleLinkChange(index, e)}
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addLink}
                        style={{
                            display: 'flex',
                            marginTop: 15,
                            borderRadius: 5,
                            padding: 4,
                        }}
                    >
                        Add Another Link
                    </button>
                    <div style={{ marginTop: 30, display: 'flex' }}>
                        <label style={{ fontWeight: 'bold' }}>
                            Description:{' '}
                        </label>
                        <textarea
                            name="description"
                            value={nftData.description}
                            onChange={handleInputChange}
                        />
                    </div>
                </form>
                <button
                    style={{
                        marginTop: 15,
                        padding: 10,
                        borderRadius: 8,
                        background:
                            'linear-gradient(135deg, lightblue, lightcoral)',
                    }}
                    type="button"
                    onClick={generateHTMLFile}
                >
                    Generate File & Upload to Arweave
                </button>
                <p>File Uploading Fee: {fee}</p>
                <p>{uploadStatus}</p>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {data && <h2>Fetch Data</h2>}
                    {data && <div dangerouslySetInnerHTML={{ __html: data }} />}
                </div>
            </div>
            <div
                style={{
                    width: '50vw',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                }}
            >
                <NFTCard
                    title={nftData.title}
                    owner={nftData.owner}
                    links={nftData.links}
                    description={nftData.description}
                />
            </div>
        </div>
    )
}

export default UploadToArweave
