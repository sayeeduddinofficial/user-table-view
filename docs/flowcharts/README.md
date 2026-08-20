# Service Flowcharts

Each service has an editable Mermaid source (`*.mmd`) and a rendered PNG in `png/`.

| Service | Source | Image |
|---|---|---|
| Audit Logs Service Flow | [`audit-logs.mmd`](audit-logs.mmd) | [`png/audit-logs.png`](png/audit-logs.png) |
| Authentication and Session Flow | [`auth.mmd`](auth.mmd) | [`png/auth.png`](png/auth.png) |
| Console (Live Logs) Flow | [`console.mmd`](console.mmd) | [`png/console.png`](png/console.png) |
| Dashboard Service Flow | [`dashboard.mmd`](dashboard.mmd) | [`png/dashboard.png`](png/dashboard.png) |
| EKS Service Flow | [`eks.mmd`](eks.mmd) | [`png/eks.png`](png/eks.png) |
| Feedback Service Flow | [`feedback.mmd`](feedback.mmd) | [`png/feedback.png`](png/feedback.png) |
| FinOps / Leadership Billing Flow | [`finops.mmd`](finops.mmd) | [`png/finops.png`](png/finops.png) |
| Load Balancer Service Flow | [`load-balancers.mmd`](load-balancers.mmd) | [`png/load-balancers.png`](png/load-balancers.png) |
| Notification Service Flow | [`notifications.mmd`](notifications.mmd) | [`png/notifications.png`](png/notifications.png) |
| Quota Request Service Flow | [`quota.mmd`](quota.mmd) | [`png/quota.png`](png/quota.png) |
| RDS Service Flow | [`rds.mmd`](rds.mmd) | [`png/rds.png`](png/rds.png) |
| Request Management Service Flow | [`requests.mmd`](requests.mmd) | [`png/requests.png`](png/requests.png) |
| Route 53 Service Flow | [`route53.mmd`](route53.mmd) | [`png/route53.png`](png/route53.png) |
| Runtime Governance Service Flow | [`runtime-governance.mmd`](runtime-governance.mmd) | [`png/runtime-governance.png`](png/runtime-governance.png) |
| S3 Bucket Service Flow | [`s3.mmd`](s3.mmd) | [`png/s3.png`](png/s3.png) |
| Settings and Profile Flow | [`settings-profile.mmd`](settings-profile.mmd) | [`png/settings-profile.png`](png/settings-profile.png) |
| User Management Flow | [`users-roles.mmd`](users-roles.mmd) | [`png/users-roles.png`](png/users-roles.png) |
| VM / EC2 Service Flow | [`vm-ec2.mmd`](vm-ec2.mmd) | [`png/vm-ec2.png`](png/vm-ec2.png) |
| VPC Service Flow | [`vpc.mmd`](vpc.mmd) | [`png/vpc.png`](png/vpc.png) |

## Re-render
```bash
npx @mermaid-js/mermaid-cli -p puppeteer-config.json -c docs/flowcharts/mermaid-mono.json -i docs/flowcharts/<name>.mmd -o docs/flowcharts/png/<name>.png -b white -w 1600
```
