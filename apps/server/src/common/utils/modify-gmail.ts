export function modifyGmail({ value }: { value: string }) {
  const email = value.toLowerCase();

  const emailReg = email.match(/(.+)(@gmail.com|@googlemail.com)/);
  if (emailReg) {
    const [, name, domain] = emailReg;

    return name.replace(/\./g, '').replace(/\+/g, '') + domain;
  }

  return email;
}
