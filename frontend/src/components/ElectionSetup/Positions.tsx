import { Button, Checkbox, Input } from '@heroui/react';

interface Position {
	name: string;
	vacancies: number;
	description: string;
	executive: boolean;
}

interface PositionsProps {
	addPosition: () => void;
	positions: Position[];
	updatePosition: (index: number, updatedPosition: Position) => void;
	removePosition: (index: number) => void;
	errors?: Record<
		number,
		{
			name?: string;
			description?: string;
			vacancies?: string;
			executive?: string;
		}
	>;
}

export default function Positions({
	addPosition,
	positions,
	updatePosition,
	removePosition,
	errors = {},
}: PositionsProps) {
	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold">Positions</h2>
				<Button color="primary" onPress={addPosition}>
					<span className="mr-0.5 text-2xl">+</span> Add Position
				</Button>
			</div>
			{positions.map((position, index) => {
				const positionErrors = errors[index] || {};
				return (
					<div
						key={index}
						className="flex flex-col gap-4 rounded-xl bg-gray-200 p-4"
					>
						<Input
							label="Position Name"
							placeholder="Enter position name"
							type="text"
							value={position.name}
							onChange={(e) =>
								updatePosition(index, { ...position, name: e.target.value })
							}
							errorMessage={positionErrors.name}
							isInvalid={!!positionErrors.name}
						/>
						<Input
							label="Description"
							placeholder="Enter position description"
							type="text"
							value={position.description}
							onChange={(e) =>
								updatePosition(index, {
									...position,
									description: e.target.value,
								})
							}
							errorMessage={positionErrors.description}
							isInvalid={!!positionErrors.description}
						/>
						<div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
							<Input
								label="Vacancies"
								placeholder="Enter number of vacancies"
								type="number"
								value={position.vacancies.toString()}
								min={1}
								onChange={(e) =>
									updatePosition(index, {
										...position,
										vacancies: parseInt(e.target.value),
									})
								}
								className="w-full md:w-3/5"
								errorMessage={positionErrors.vacancies}
								isInvalid={!!positionErrors.vacancies}
							/>
							<div className="flex w-full items-center gap-4 md:w-2/5">
								<Checkbox
									checked={position.executive}
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										updatePosition(index, {
											...position,
											executive: e.target.checked,
										})
									}
								>
									Executive
								</Checkbox>
								<Button
									color="secondary"
									onPress={() => removePosition(index)}
									className="w-full"
									isDisabled={positions.length === 1}
								>
									<span className="mr-0.5 text-2xl">-</span> Remove Position
								</Button>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
