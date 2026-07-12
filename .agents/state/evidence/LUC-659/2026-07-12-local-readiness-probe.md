# LUC-659 local readiness probe evidence

Date: 2026-07-12
Agent: 09 DRE (Deployment & Reliability Engineer)
Issue: LUC-659
Scope: local read-only readiness/health verification for Soar and Roost

## Summary

- `Soar /health`: implemented and verified (`200 OK`)
- `Soar /ready`: blocked by error (`503 Service Unavailable`)
- `Roost /health`: implemented and verified (`200 OK`)

## Probe commands

```powershell
Invoke-WebRequest http://127.0.0.1:3001/health
Invoke-WebRequest http://127.0.0.1:3001/ready
Invoke-WebRequest http://127.0.0.1:3102/health
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3001,3002,3102 }
Get-Process -Id <listener pids>
```

## Results

### Soar API health

- URL: `http://127.0.0.1:3001/health`
- Timestamp UTC: `2026-07-12T13:10:55.1387265Z`
- HTTP: `200 OK`
- Body:

```json
{"status":"ok","service":"api","timestamp":"2026-07-12T13:10:55.168Z"}
```

### Soar API readiness

- URL: `http://127.0.0.1:3001/ready`
- Timestamp UTC: `2026-07-12T13:10:55.1831238Z`
- HTTP: `503 Service Unavailable`
- Error:

```text
The remote server returned HTTP 503 Service Unavailable.
```

- Response body: empty

### Roost API health

- URL: `http://127.0.0.1:3102/health`
- Timestamp UTC: `2026-07-12T13:10:56.7186229Z`
- HTTP: `200 OK`
- Body:

```json
{"status":"ok","service":"companycore","name":"LuckySparrow Company Core","build":{"commit":"unknown","image":"unknown"}}
```

## Listener snapshot

```text
3001 -> pid 35652 -> node
3002 -> pid 46840 -> node
3102 -> pid 4876 -> wslrelay
3102 -> pid 17888 -> com.docker.backend
```

## Evaluation

- The local recovery lane is unblocked enough to collect evidence.
- The evidence does not support a healthy Soar local readiness claim because `/ready` still fails.
- Roost local API health is currently green.
- No credentials, request headers, cookies, or secret values were captured in this artifact.

## Recommended disposition

- Close `LUC-659` when its evidence-restoration scope is accepted; this artifact satisfies that scope without claiming that Soar readiness is green.
- Create or resume a separate Soar owner-path follow-up that applies the local keyring change to the running development backend, then restores `/ready` to `200` or documents an explicitly accepted readiness contract if `503` is expected.
