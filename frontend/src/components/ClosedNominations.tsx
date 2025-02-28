import { Button, Input } from '@heroui/react';
import Papa from 'papaparse';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';



import { fetcher } from '../lib/fetcher';


interface ClosedNominationsProps {
	electionId: number;
	setSliderValue: React.Dispatch<React.SetStateAction<number>>;
}

interface Nomination {
	name: string;
	statement: string;
	roles: string;
}

export default function ClosedNominations({
	electionId,
	setSliderValue,
}: ClosedNominationsProps) {
	const [nominations, setNominations] = useState<Nomination[]>([]);
	const [status, setStatus] = useState({ text: '', type: '' });

	function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target?.files?.[0];
		if (!file) {
			console.error('No file selected');
			return;
		}

		Papa.parse(file, {
			header: true,
			complete: (results: { data: Nomination[] }) => {
				console.log(results);
				const parsedNominations = results.data.map((row: any) => ({
					name: row.Name,
					statement: row.Statement,
					roles: row.Roles,
				}));
				console.log(parsedNominations);
				setNominations(parsedNominations);
			},
			error: (error: any) => {
				console.error('Error parsing CSV:', error);
			},
		});
	}

	const createCandidates = useSWRMutation(
		`candidates/${electionId}`,
		(url) => fetcher.post.mutate(url, { arg: nominations }),
		{
			onError: (error) => {
				let errorMessage;
				if (error.response?.status === 400) {
					errorMessage =
						'Position not found in the database. Please check the CSV file.';
				} else if (error.response?.status === 409) {
					errorMessage =
						'Conflict detected. Some candidates may already exist.';
				} else {
					errorMessage = 'Failed to create candidates. Please try again.';
				}
				setStatus({
					text: errorMessage,
					type: 'error',
				});
			},
			onSuccess: (data) => {
				setStatus({
					text: 'Candidates created successfully!',
					type: 'success',
				});
				console.log('Candidates created:', data);
				setTimeout(() => {
					updateElectionStatus.trigger();
				}, 3000);
			},
		},
	);

	const updateElectionStatus = useSWRMutation(
		`elections/${electionId}`,
		(url) => fetcher.patch.mutate(url, { arg: { status: 2 } }),
		{
			onError: () => {
				const errorMessage =
					'Failed to update election status. Please try again.';
				setStatus({
					text: errorMessage,
					type: 'error',
				});
			},
			onSuccess: (data) => {
				setStatus({
					text: 'Election status updated successfully!',
					type: 'success',
				});
				console.log('Election status updated:', data);
				setTimeout(() => {
					setSliderValue(4);
				}, 3000);
			},
		},
	);

	const handleContinue = async () => {
		setStatus({ text: '', type: '' });
		createCandidates.trigger();
	};

	return (
		<div className="mt-8">
			<h1>
				Once the Google Forms is closed, please download the file as a CSV file
				and upload it here. Once uploaded, check the displayed nominations to
				see if there are any errors, if there any no issues, continue to the
				next stage.
			</h1>
			<Input
				type="file"
				label="Upload CSV"
				accept=".csv"
				className="mt-4"
				onChange={handleFileUpload}
			/>
			{nominations.length > 0 && (
				<h2 className="mt-6 text-center text-xl font-semibold">Nominations</h2>
			)}
			<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				{nominations.map((nomination, index) => (
					<div
						key={index}
						className="flex flex-col gap-4 rounded-xl bg-gray-200 p-4"
					>
						<p>
							<strong>Name:</strong> {nomination.name}
						</p>
						<p>
							<strong>Roles:</strong> {nomination.roles}
						</p>
						<p>
							<strong>Statement:</strong> {nomination.statement}
						</p>
					</div>
				))}
			</div>
			<div className="mt-8 flex justify-center">
				<Button color="primary" onPress={handleContinue}>
					Continue
				</Button>
			</div>
			{status.text && (
				<div
					className={`mt-4 text-center ${status.type === 'error' ? 'text-red-500' : 'text-green-500'}`}
				>
					{status.text}
				</div>
			)}
		</div>
	);
}