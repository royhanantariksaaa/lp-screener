# Intelligence provider contract

The screener accepts an optional `VITE_INTELLIGENCE_API_URL` build-time variable. When configured, it requests:

`GET <endpoint>?symbols=SOL-USDC,JUP-SOL,...`

The response shape is:

```json
{
  "pools": [
    {
      "symbol": "SOL-USDC",
      "smartWallets": 12,
      "walletFlow": "INFLOW",
      "kolMentions": 6,
      "kolRecency": "18m",
      "screenScore": 89
    }
  ]
}
```

`walletFlow` is one of `INFLOW`, `OUTFLOW`, `MIXED`, or `UNAVAILABLE`. The UI marks provider-backed rows as live and leaves the wallet/KOL fields explicitly unavailable when the variable is absent or the provider fails.

