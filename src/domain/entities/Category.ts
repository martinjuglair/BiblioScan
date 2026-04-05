export interface CategoryProps {
  id: string;
  name: string;
  createdAt: Date;
}

export class Category {
  constructor(public readonly props: CategoryProps) {}

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
