export interface Flight {
  id: string;
  userId: string;
  from: string;
  to: string;
  departureDate: FirebaseFirestore.Timestamp;
  arrivalDate: FirebaseFirestore.Timestamp;
  airline: string;
  ticketPrice: number;
  status: "confirmed" | "cancelled";
}
export interface FamilleyData {
  familyName: string;
  nativeOf: string;
  district: string;
  province: string;
  country: string;
  residence: string;
  email: string;
  phone: string;
  occupation: string;
  worksAt: string;
}
export interface FamilleyPostData {
  photoUrl: string;
  story: string;
  uid: string;
}

export interface GetUserMiddleware {
  uid: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string;
  password: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
}
export interface FamilleyRegistrationData extends FamilleyData {
  password: string;
}

// export interface GetUserMiddleware {
//   id: string;
//   sub: string;
//   name: string;
//   email: string;
//   picture: string;
//   given_name: string;
//   updated_at: number;
//   family_name: string;
//   email_verified: boolean;
//   preferred_username: string | null;
// }

export interface DummyAccount {
  id: string;
  balance: number;
  account_number: string;
  currency: string;
  country: string;
}
