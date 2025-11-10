# Paws

Keyboard shortcuts for the AWS Console

## Overview

Paws adds Vim-like keyboard shortcuts to the AWS Management Console.

## Installation

Paws can be used by installing [paws](https://github.com/XargsUK/paws/raw/master/paws.user.js)
in [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) (Chrome)
or [Greasemonkey](https://addons.mozilla.org/en-us/firefox/addon/greasemonkey/) (Firefox).

## Shortcuts

### Services

Open the default view of a service.

| Service | Shortcut |
|---------|----------|
| Home | home |
| CloudTrail | ct / cct |
| EC2 | ec2 |
| IAM | iam |
| RDS | rds |
| S3 | s3 |
| VPC | vpc |
| CloudFormation | cfn |
| CloudFront | clf |
| CodeDeploy | cd |
| CodePipeline | cp |
| Systems Manager | ssm |
| Lambda | da |
| Organizations | org |
| CloudWatch | cw |

### Pages

Open a specific page within a service.

| Page | Shortcut |
|------|----------|
| AMIs | pam |
| EBS Volumes | peb |
| Load Balancers (Classic) | pel / elb |
| Load Balancers (ALB/NLB) | alb |
| Security Groups | psg / sg |

### Sidebar navigation

Use the left sidebar navigation menu.

| Action | Shortcut |
|--------|----------|
| Select next nav link | j |
| Select previous nav link | k |
| Click on selected nav link | l / return |

### Miscellaneous

| Action | Shortcut |
|--------|----------|
| Show shortcuts | ? |
| Focus search box | / |
| Focus Lambda search box | lam |
| Toggle region menu dropdown | r |

## Licence

Paws is released under the MIT Licence. Please see the LICENSE.md file for details.

## Credits

This is a fork of the project [paws](https://github.com/tombenner/paws).
All credit for the original project goes to [tombenner](https://github.com/tombenner/).
