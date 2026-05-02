# Jira Forge Issue Panel

Forge app hiển thị thông tin issue trong Jira Issue Panel:
- Tên issue (key + summary)
- Status hiện tại
- Assignee

## Prerequisites

- Node.js LTS
- Forge CLI:
  ```bash
  npm install -g @forge/cli

## Setup
1. Cài dependencies:
npm install

2. Login Forge:
forge login

## Deploy
forge deploy -e development

## Install lên Jira dev site
forge install -e development -p jira -s <your-site>.atlassian.net

Khi nâng cấp app sau deploy mới:
forge install --upgrade -e development -p jira -s <your-site>.atlassian.net

## Run (local debug)
forge tunnel

## Gỡ app khỏi site
forge uninstall -e development -p jira -s <your-site>.atlassian.net