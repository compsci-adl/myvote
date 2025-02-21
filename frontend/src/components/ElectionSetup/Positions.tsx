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
}

export default function Positions({
	addPosition,
	positions,
	updatePosition,
	removePosition,
}: PositionsProps) {
	return (
		<div>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-lg font-semibold">Positions</h2>
				<Button color="primary" onPress={addPosition}>
					<span className="mr-0.5 text-2xl">+</span> Add Position
				</Button>
			</div>
			{positions.map((position, index) => (
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
					/>
					<div className="flex items-center gap-2 md:gap-6">
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
							className="w-1/3 md:w-full"
						/>
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
							className="w-[40%] md:w-1/6"
						>
							<span className="mr-0.5 text-2xl">-</span> Remove Position
						</Button>
					</div>
				</div>
			))}
		</div>
	);
}
