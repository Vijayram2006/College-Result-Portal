# Credentials handover

Passwords, keys and recovery codes are **never** sent by WhatsApp, e-mail or chat, and never committed to Git.

1. The college creates a shared vault in a password manager (Bitwarden, 1Password or KeePassXC on the COE office
   computer) owned by the Controller of Examinations.
2. The technical team puts every secret in it, one item each:
   - Hosting accounts: Render, Vercel, Neon, GitHub (owner logins with two-step sign-in on each)
   - Render deploy hook, Vercel token, Neon owner and `kvell_app` / `kvell_readonly` database passwords
   - `BACKUP_PASSPHRASE` (without it the backups cannot be read)
   - Starting passwords of the COE accounts (each COE changes theirs at first sign-in)
3. Every secret that was ever shared in chat, e-mail or a file during development is **rotated** before go-live
   (new value in the vault, old one revoked). Known so far: the Render API key and the old local demo passwords.
4. Access to the vault is limited to the people on the approved access list and reviewed every semester.
5. When a person leaves: remove their vault access, suspend their portal account, rotate any secret they knew.
