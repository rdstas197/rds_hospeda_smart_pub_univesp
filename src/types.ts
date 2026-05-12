export type UserRole = 'Administrador' | 'Gestor/Gerente' | 'Operador 1' | 'Operador 2';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

export interface Client {
  id: string;
  full_name: string;
  rg?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_zip?: string;
}

export interface Product {
  id: string;
  description: string;
  unit_value: number;
}

export interface Room {
  id: string;
  room_number: string;
  description: string;
  room_type: 'Standard' | 'Luxo' | 'Master';
  observations?: string;
}

export interface Rate {
  id: string;
  description: string;
  value: number;
  special_value?: number;
  status: 'Ativa' | 'Inativa';
}

export type ReservationStatus = 'Gerada' | 'Iniciada' | 'Finalizada';

export interface Reservation {
  id: string;
  client_id: string;
  room_id: string;
  rate_id: string;
  check_in_date: string;
  check_out_date: string;
  is_corporate: boolean;
  corporate_name?: string;
  corporate_cnpj?: string;
  billing_type?: string;
  observations?: string;
  status: ReservationStatus;
  client?: Client;
  room?: Room;
  rate?: Rate;
}

export interface Consumption {
  id: string;
  reservation_id: string;
  product_id: string;
  quantity: number;
  unit_value: number;
  product?: Product;
}
