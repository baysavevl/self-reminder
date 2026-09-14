-- Default personal account for first login.
-- Passwords are stored as scrypt hashes; the plaintext password is intentionally
-- not present in source control.
insert or ignore into users (id, username, password_hash)
values (
  'a0915457-60b8-4cf3-8fc1-8b81a5f5eff5',
  'vinh',
  'scrypt:bb22905ca63ff093bbc897c11adb279a:f80887ea49541635d9076d0f4719c33d1965e3ae0119aafb51cf0c9d56dc6bf9750955c380c8155bff99d46cc841a50840cdcf698e3c4c0663fe2e16175503b9'
);
