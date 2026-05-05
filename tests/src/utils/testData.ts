export type ManagerTestData = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  employeeId: string;
};

export type BranchTestData = {
  branchName: string;
  branchEmail: string;
  prefix: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  categories: string[];
  country: string;
  state: string;
  city: string;
};

export type UserTestData = {
  branchName?: string;
  role: string;
  speciality?: string;
  qualification?: string;
  title?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
};

export type BoardStatusData = {
  name: string;
  type?: string;
  color?: string;
};

export type BoardTestData = {
  branchName?: string;
  boardName: string;
  description: string;
  statuses: BoardStatusData[];
};

export type LeadTestData = {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  gender: string;
  source: string;
  languages: string[];
  status: string;
  bloodGroup: string;
  homePhone: string;
  mobile: string;
  email: string;
  houseNumber: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  notes: string;
};

function timestampSuffix() {
  return Date.now().toString().slice(-8);
}

function alphaSuffix(value: string) {
  return value
    .split('')
    .map((digit) => String.fromCharCode(65 + Number(digit)))
    .join('');
}

export function generateManagerTestData(): ManagerTestData {
  const suffix = timestampSuffix();
  const firstName = `Auto${suffix.slice(0, 4)}`;
  const lastName = `Manager${suffix.slice(4)}`;
  const fullName = `${firstName} ${lastName}`;

  return {
    firstName,
    lastName,
    fullName,
    email: `automanager${suffix}@example.com`,
    phone: `9${suffix.padStart(9, '0').slice(0, 9)}`,
    employeeId: `MGR${suffix}`,
  };
}

export function generateBranchTestData(): BranchTestData {
  const suffix = timestampSuffix();

  return {
    branchName: `Anna Nagar ${suffix}`,
    branchEmail: `qabranch${suffix}@example.com`,
    prefix: 'EDR',
    phone: `9${suffix.padStart(9, '0').slice(0, 9)}`,
    addressLine1: `Elatre ${suffix.slice(0, 4)}`,
    addressLine2: `Perungudi ${suffix.slice(4)}`,
    postalCode: '600032',
    categories: ['orthodontics', 'endodontics'],
    country: 'India',
    state: 'Andaman and Nicobar Islands',
    city: 'Bamboo Flat',
  };
}

export function generateUserTestData(): UserTestData {
  return generateUserTestDataForRole('Provider');
}

export function generateUserTestDataForRole(role: string): UserTestData {
  const suffix = timestampSuffix();
  const letters = alphaSuffix(suffix);
  const firstName = `Auto${letters.slice(0, 4)}`;
  const compactRole = role.replace(/\s+/g, '');
  const lastName = `${compactRole}${letters.slice(4)}`;
  const fullName = `${firstName} ${lastName}`;

  return {
    role,
    firstName,
    lastName,
    fullName,
    email: `autouser${suffix}@example.com`,
    mobile: `9${suffix.padStart(9, '0').slice(0, 9)}`,
    gender: 'Female',
    addressLine1: `Elatre ${letters.slice(0, 4)}`,
    addressLine2: `Perungudi ${letters.slice(4)}`,
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Thanjavur',
    postalCode: '600342',
  };
}

export function generateBoardTestData(branchName?: string): BoardTestData {
  const suffix = timestampSuffix();

  return {
    branchName,
    boardName: `Board ${suffix}`,
    description: `Auto board ${suffix}`,
    statuses: [
      { name: 'Processing', type: 'In Progress' },
      { name: 'Complete', color: '#75a4e6' },
      { name: 'Cancel', color: '#b01c1c' },
    ],
  };
}

export function generateLeadTestData(): LeadTestData {
  const suffix = timestampSuffix();
  const letters = alphaSuffix(suffix);
  const firstName = `Lead${letters.slice(0, 3)}`;
  const middleName = `Mid${letters.slice(3, 5)}`;
  const lastName = `User${letters.slice(5)}`;

  return {
    firstName,
    middleName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender: 'Female',
    source: 'Website',
    languages: ['Tamil', 'English', 'Hindi'],
    status: 'Processing',
    bloodGroup: 'B-',
    homePhone: `8${suffix.padStart(10, '0').slice(0, 10)}`,
    mobile: `9${suffix.padStart(10, '0').slice(0, 10)}`,
    email: `autolead${suffix}@example.com`,
    houseNumber: `${suffix.slice(0, 2)}`,
    addressLine1: 'Elatre',
    addressLine2: 'Perungudi',
    addressLine3: `${suffix.slice(2, 5)}`,
    country: 'India',
    state: 'Andaman and Nicobar Islands',
    city: 'Nicobar',
    postalCode: '600040',
    notes: 'New patient',
  };
}
