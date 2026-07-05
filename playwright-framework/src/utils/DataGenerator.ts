export class DataGenerator {
  static randomEmail(): string {
    const id = Math.random().toString(36).substring(2, 10);
    return `user_${id}@test.com`;
  }

  static randomPhoneNumber(): string {
    const num = Math.floor(1000000 + Math.random() * 9000000);
    return `(555) ${String(num).slice(0, 3)}-${String(num).slice(3, 7)}`;
  }

  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static futureDate(daysAhead: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0];
  }

  static randomName(): { firstName: string; lastName: string } {
    const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson'];
    return {
      firstName: firstNames[this.randomInt(0, firstNames.length - 1)],
      lastName: lastNames[this.randomInt(0, lastNames.length - 1)],
    };
  }

  static creditCard(): { cardNumber: string; expiry: string; cvv: string } {
    return {
      cardNumber: '4111111111111111',
      expiry: '12/28',
      cvv: String(this.randomInt(100, 999)),
    };
  }
}
