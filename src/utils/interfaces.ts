export interface Bank {
  name: string;
  id: number;
  slug: string;
}

export interface Assignment {
  integration: number;
  assignee_id: number;
  assignee_type: string;
  expired: boolean;
  account_type: string;
  assigned_at: FirebaseFirestore.Timestamp;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  customer_code: string;
  phone: string;
  risk_action: string;
}

export interface TraditionalAccount {
  bank: Bank;
  account_name: string;
  account_number: string;
  assigned: boolean;
  currency: string;
  metadata: any;
  active: boolean;
  id: number;
  created_at: FirebaseFirestore.Timestamp;
  updated_at: FirebaseFirestore.Timestamp;
  assignment: Assignment;
  customer: Customer;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  walletBalance: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface CryptoAccount {
  id: string;
  userId: string;
  cryptoType: "Bitcoin" | "Ethereum" | "USDT"; // Add more as needed
  walletAddress: string;
  balance: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "buy" | "sell" | "send";
  cryptoType: "Bitcoin" | "Ethereum" | "USDT";
  amount: number;
  price: number;
  status: "pending" | "completed" | "failed";
  timestamp: FirebaseFirestore.Timestamp;
}

export interface VirtualCard {
  id: string;
  userId: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  balance: number;
  currency: "USD" | "EUR";
  status: "active" | "blocked";
  issuedAt: FirebaseFirestore.Timestamp;
}

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
export interface GetUserMiddleware {
  id: string;
  sub: string;
  name: string;
  email: string;
  picture: string;
  given_name: string;
  updated_at: number;
  family_name: string;
  email_verified: boolean;
  preferred_username: string | null;
}

export interface DummyAccount {
  id: string;
  balance: number;
  account_number: string;
  currency: string;
  country: string;
}