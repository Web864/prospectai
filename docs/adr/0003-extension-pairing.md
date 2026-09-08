# ADR 0003: Manifest V3 and PKCE Extension Pairing

Status: Accepted

The Chrome extension is a Manifest V3 client with `activeTab` and `storage` only. It opens a web-based authorization handoff and exchanges a one-time PKCE grant for a limited extension credential. It has no user password flow, broad host permission, remotely hosted executable code, or access to web session cookies.
