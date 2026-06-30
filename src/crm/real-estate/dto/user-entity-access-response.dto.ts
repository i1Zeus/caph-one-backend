export class UserEntityAccessResponseDto {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  propertyGroupId?: number;
  propertyGroup?: {
    id: number;
    name: string;
  };
  cityCenterId?: number;
  cityCenter?: {
    id: number;
    name: string;
  };
  sportsCityId?: number;
  sportsCity?: {
    id: number;
    name: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
