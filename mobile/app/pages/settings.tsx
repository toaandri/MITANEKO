import React, { useMemo, useState } from 'react';
import {
	Alert,
	Image,
	Modal,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View,
} from 'react-native';

type Publication = {
	id: string;
	title: string;
	content: string;
	date: string;
	language: 'Malagasy' | 'Francais' | 'English';
	region: string;
	commune: string;
};

const LANGUAGE_OPTIONS: Array<'Malagasy' | 'Francais' | 'English'> = [
	'Malagasy',
	'Francais',
	'English',
];

const REGION_TREE: Record<string, Record<string, string[]>> = {
	Analamanga: {
		'Antananarivo Renivohitra': ['Isotry', 'Anosy', 'Andavamamba', '67Ha'],
		Avaradrano: ['Ambohitrarahaba', 'Alasora', 'Sabotsy Namehana'],
	},
	Vakinankaratra: {
		Antsirabe: ['Ambohidrano', 'Tsarasaotra', 'Antanambao'],
		Betafo: ['Mandritsara', 'Antohobe', 'Soanindrariny'],
	},
	Atsinanana: {
		Toamasina: ['Tanambao V', 'Morafeno', 'Mangarano'],
		Vatomandry: ['Miadana', 'Anjoma', 'Niarovana'],
	},
};

const AVATAR_PRESETS = [
	'https://i.pravatar.cc/200?img=1',
	'https://i.pravatar.cc/200?img=5',
	'https://i.pravatar.cc/200?img=12',
	'https://i.pravatar.cc/200?img=20',
];

const MY_PUBLICATIONS: Publication[] = [
	{
		id: '1',
		title: 'Nettoyage de quartier',
		content: 'Mobilisation ce samedi pour nettoyer les ruelles principales.',
		date: '2026-06-20',
		language: 'Francais',
		region: 'Analamanga',
		commune: 'Antananarivo Renivohitra',
	},
	{
		id: '2',
		title: 'Fanentanana eny an-tsena',
		content: 'Hampahafantarana ny mponina momba ny fitantanana fako.',
		date: '2026-06-18',
		language: 'Malagasy',
		region: 'Analamanga',
		commune: 'Avaradrano',
	},
	{
		id: '3',
		title: 'Road safety awareness',
		content: 'Community talk on road safety for children and parents.',
		date: '2026-06-10',
		language: 'English',
		region: 'Atsinanana',
		commune: 'Toamasina',
	},
];

type PickerState = {
	visible: boolean;
	title: string;
	options: string[];
	onSelect: (value: string) => void;
};

const EMPTY_PICKER: PickerState = {
	visible: false,
	title: '',
	options: [],
	onSelect: () => undefined,
};

export default function SettingsScreen() {
	const initialRegion = Object.keys(REGION_TREE)[0];
	const initialCommune = Object.keys(REGION_TREE[initialRegion])[0];
	const initialFokontany = REGION_TREE[initialRegion][initialCommune][0];

	const [profileName, setProfileName] = useState('Miora Rakoto');
	const [profileEmail, setProfileEmail] = useState('miora.rakoto@example.com');
	const [profilePhone, setProfilePhone] = useState('+261 34 12 345 67');
	const [profileBio, setProfileBio] = useState(
		'Actif/active dans les actions citoyennes de mon quartier.',
	);
	const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
	const [avatarInput, setAvatarInput] = useState(AVATAR_PRESETS[0]);
	const [avatarIndex, setAvatarIndex] = useState(0);

	const [selectedLanguage, setSelectedLanguage] =
		useState<(typeof LANGUAGE_OPTIONS)[number]>('Francais');
	const [selectedRegion, setSelectedRegion] = useState(initialRegion);
	const [selectedCommune, setSelectedCommune] = useState(initialCommune);
	const [selectedFokontany, setSelectedFokontany] = useState(initialFokontany);

	const [pickerState, setPickerState] = useState<PickerState>(EMPTY_PICKER);

	const [generatedCode, setGeneratedCode] = useState('');
	const [enteredCode, setEnteredCode] = useState('');
	const [resetPassword, setResetPassword] = useState('');
	const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

	const [accessLargeText, setAccessLargeText] = useState(false);
	const [accessHighContrast, setAccessHighContrast] = useState(false);
	const [accessScreenReaderHints, setAccessScreenReaderHints] = useState(true);
	const [accessReduceMotion, setAccessReduceMotion] = useState(false);

	const communeOptions = useMemo(
		() => Object.keys(REGION_TREE[selectedRegion] ?? {}),
		[selectedRegion],
	);

	const fokontanyOptions = useMemo(
		() => REGION_TREE[selectedRegion]?.[selectedCommune] ?? [],
		[selectedRegion, selectedCommune],
	);

	const filteredPublications = useMemo(() => {
		return MY_PUBLICATIONS.filter((item) => {
			const languageMatches = item.language === selectedLanguage;
			const regionMatches = item.region === selectedRegion;
			const communeMatches = item.commune === selectedCommune;
			return languageMatches && regionMatches && communeMatches;
		});
	}, [selectedLanguage, selectedRegion, selectedCommune]);

	const openPicker = (
		title: string,
		options: string[],
		onSelect: (value: string) => void,
	) => {
		setPickerState({ visible: true, title, options, onSelect });
	};

	const closePicker = () => {
		setPickerState(EMPTY_PICKER);
	};

	const applyAvatarFromInput = () => {
		const clean = avatarInput.trim();
		if (!clean) {
			Alert.alert('Photo de profil', 'Veuillez entrer une URL valide.');
			return;
		}
		setAvatarUrl(clean);
		Alert.alert('Photo de profil', 'Votre photo de profil a ete mise a jour.');
	};

	const useNextPresetAvatar = () => {
		const next = (avatarIndex + 1) % AVATAR_PRESETS.length;
		setAvatarIndex(next);
		setAvatarUrl(AVATAR_PRESETS[next]);
		setAvatarInput(AVATAR_PRESETS[next]);
	};

	const saveProfile = () => {
		Alert.alert('Profil', 'Les informations du profil ont ete enregistrees.');
	};

	const sendVerificationCode = () => {
		const code = String(Math.floor(100000 + Math.random() * 900000));
		setGeneratedCode(code);
		Alert.alert(
			'Code envoye',
			`Un code a 6 chiffres a ete genere: ${code}\n(Utilise pour tester l\'interface.)`,
		);
	};

	const validateResetPassword = () => {
		if (!generatedCode) {
			Alert.alert('Code manquant', 'Veuillez d\'abord demander un code.');
			return;
		}
		if (enteredCode.length !== 6) {
			Alert.alert('Code invalide', 'Le code doit contenir 6 chiffres.');
			return;
		}
		if (enteredCode !== generatedCode) {
			Alert.alert('Verification echouee', 'Le code saisi est incorrect.');
			return;
		}
		if (!resetPassword || resetPassword.length < 8) {
			Alert.alert(
				'Mot de passe faible',
				'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
			);
			return;
		}
		if (resetPassword !== resetPasswordConfirm) {
			Alert.alert('Confirmation invalide', 'Les mots de passe ne correspondent pas.');
			return;
		}

		setEnteredCode('');
		setGeneratedCode('');
		setResetPassword('');
		setResetPasswordConfirm('');
		Alert.alert('Succes', 'Votre mot de passe a ete change avec succes.');
	};

	const updateCurrentPassword = () => {
		if (!currentPassword || !newPassword || !newPasswordConfirm) {
			Alert.alert('Champs requis', 'Veuillez remplir tous les champs mot de passe.');
			return;
		}
		if (newPassword.length < 8) {
			Alert.alert(
				'Mot de passe faible',
				'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
			);
			return;
		}
		if (newPassword !== newPasswordConfirm) {
			Alert.alert('Erreur', 'La confirmation du nouveau mot de passe est incorrecte.');
			return;
		}

		setCurrentPassword('');
		setNewPassword('');
		setNewPasswordConfirm('');
		Alert.alert('Mot de passe', 'Votre mot de passe actuel a ete modifie.');
	};

	const logout = () => {
		Alert.alert('Deconnexion', 'Vous avez ete deconnecte(e).');
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.container}>
				<Text style={styles.pageTitle}>Parametres</Text>
				<Text style={styles.pageSubtitle}>
					Personnalisez votre compte, votre securite et vos preferences locales.
				</Text>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Profil</Text>
					<Text style={styles.sectionDescription}>
						Modifiez votre identite, votre photo et vos informations de contact.
					</Text>

					<View style={styles.avatarRow}>
						<Image source={{ uri: avatarUrl }} style={styles.avatar} />
						<View style={styles.avatarActions}>
							<TextInput
								value={avatarInput}
								onChangeText={setAvatarInput}
								placeholder="URL de la photo de profil"
								placeholderTextColor="#65676b"
								style={styles.input}
							/>
							<View style={styles.rowButtons}>
								<Pressable style={styles.secondaryButton} onPress={applyAvatarFromInput}>
									<Text style={styles.secondaryButtonText}>Appliquer URL</Text>
								</Pressable>
								<Pressable style={styles.secondaryButton} onPress={useNextPresetAvatar}>
									<Text style={styles.secondaryButtonText}>Avatar suivant</Text>
								</Pressable>
							</View>
						</View>
					</View>

					<TextInput
						value={profileName}
						onChangeText={setProfileName}
						placeholder="Nom complet"
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={profileEmail}
						onChangeText={setProfileEmail}
						placeholder="Email"
						keyboardType="email-address"
						autoCapitalize="none"
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={profilePhone}
						onChangeText={setProfilePhone}
						placeholder="Telephone"
						keyboardType="phone-pad"
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={profileBio}
						onChangeText={setProfileBio}
						placeholder="Bio"
						placeholderTextColor="#65676b"
						multiline
						style={[styles.input, styles.multilineInput]}
					/>
					<Pressable style={styles.primaryButton} onPress={saveProfile}>
						<Text style={styles.primaryButtonText}>Enregistrer le profil</Text>
					</Pressable>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Langue, Region, Commune, Fokontany</Text>
					<Text style={styles.sectionDescription}>
						Ces choix influencent les contenus affiches dans vos publications.
					</Text>

					<SelectorField
						label="Langue"
						value={selectedLanguage}
						onPress={() =>
							openPicker('Choisir la langue', [...LANGUAGE_OPTIONS], (value) => {
								setSelectedLanguage(value as (typeof LANGUAGE_OPTIONS)[number]);
							})
						}
					/>

					<SelectorField
						label="Region"
						value={selectedRegion}
						onPress={() =>
							openPicker('Choisir la region', Object.keys(REGION_TREE), (value) => {
								const firstCommune = Object.keys(REGION_TREE[value])[0];
								const firstFokontany = REGION_TREE[value][firstCommune][0];
								setSelectedRegion(value);
								setSelectedCommune(firstCommune);
								setSelectedFokontany(firstFokontany);
							})
						}
					/>

					<SelectorField
						label="Commune"
						value={selectedCommune}
						onPress={() =>
							openPicker('Choisir la commune', communeOptions, (value) => {
								const nextFokontany = REGION_TREE[selectedRegion][value][0];
								setSelectedCommune(value);
								setSelectedFokontany(nextFokontany);
							})
						}
					/>

					<SelectorField
						label="Fokontany"
						value={selectedFokontany}
						onPress={() =>
							openPicker('Choisir le fokontany', fokontanyOptions, (value) => {
								setSelectedFokontany(value);
							})
						}
					/>

					<View style={styles.infoBox}>
						<Text style={styles.infoText}>
							Affichage actif: {selectedLanguage} - {selectedRegion} / {selectedCommune} /{' '}
							{selectedFokontany}
						</Text>
					</View>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Publications</Text>
					<Text style={styles.sectionDescription}>
						Liste de vos publications selon la langue et la localisation selectionnees.
					</Text>

					{filteredPublications.length === 0 ? (
						<View style={styles.emptyState}>
							<Text style={styles.emptyStateTitle}>Aucune publication correspondante</Text>
							<Text style={styles.emptyStateText}>
								Essayez de changer la langue, la region ou la commune pour afficher vos
								contenus deja publies.
							</Text>
						</View>
					) : (
						filteredPublications.map((item) => (
							<View key={item.id} style={styles.publicationCard}>
								<Text style={styles.publicationTitle}>{item.title}</Text>
								<Text style={styles.publicationMeta}>
									{item.date} • {item.language} • {item.region} / {item.commune}
								</Text>
								<Text style={styles.publicationContent}>{item.content}</Text>
							</View>
						))
					)}
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Accessibilite</Text>
					<Text style={styles.sectionDescription}>
						Configurez votre confort visuel et les elements auxquels vous avez acces.
					</Text>

					<ToggleRow
						label="Texte agrandi"
						value={accessLargeText}
						onValueChange={setAccessLargeText}
					/>
					<ToggleRow
						label="Contraste eleve"
						value={accessHighContrast}
						onValueChange={setAccessHighContrast}
					/>
					<ToggleRow
						label="Indices lecteur d'ecran"
						value={accessScreenReaderHints}
						onValueChange={setAccessScreenReaderHints}
					/>
					<ToggleRow
						label="Reduire les animations"
						value={accessReduceMotion}
						onValueChange={setAccessReduceMotion}
					/>

					<View style={styles.accessList}>
						<Text style={styles.accessListTitle}>Elements accessibles</Text>
						<Text style={styles.accessListItem}>- Tableau de bord citoyen</Text>
						<Text style={styles.accessListItem}>- Publications personnelles</Text>
						<Text style={styles.accessListItem}>- Historique des signalements</Text>
						<Text style={styles.accessListItem}>- Centre d'aide et support</Text>
					</View>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Changement de mot de passe (code 6 chiffres)</Text>
					<Text style={styles.sectionDescription}>
						Demandez un code, saisissez-le puis validez votre nouveau mot de passe.
					</Text>

					<Pressable style={styles.secondaryButtonFull} onPress={sendVerificationCode}>
						<Text style={styles.secondaryButtonText}>Recevoir un code a 6 chiffres</Text>
					</Pressable>

					<TextInput
						value={enteredCode}
						onChangeText={(text) => setEnteredCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
						placeholder="Code de verification (6 chiffres)"
						keyboardType="number-pad"
						maxLength={6}
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={resetPassword}
						onChangeText={setResetPassword}
						placeholder="Nouveau mot de passe"
						secureTextEntry
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={resetPasswordConfirm}
						onChangeText={setResetPasswordConfirm}
						placeholder="Confirmer le nouveau mot de passe"
						secureTextEntry
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<Pressable style={styles.primaryButton} onPress={validateResetPassword}>
						<Text style={styles.primaryButtonText}>Valider le changement</Text>
					</Pressable>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Mot de passe</Text>
					<Text style={styles.sectionDescription}>
						Modifiez votre mot de passe actuel et gerez la securite du compte.
					</Text>

					<TextInput
						value={currentPassword}
						onChangeText={setCurrentPassword}
						placeholder="Mot de passe actuel"
						secureTextEntry
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={newPassword}
						onChangeText={setNewPassword}
						placeholder="Nouveau mot de passe"
						secureTextEntry
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<TextInput
						value={newPasswordConfirm}
						onChangeText={setNewPasswordConfirm}
						placeholder="Confirmer le nouveau mot de passe"
						secureTextEntry
						placeholderTextColor="#65676b"
						style={styles.input}
					/>
					<Pressable style={styles.primaryButton} onPress={updateCurrentPassword}>
						<Text style={styles.primaryButtonText}>Mettre a jour le mot de passe</Text>
					</Pressable>
					<Pressable
						style={styles.secondaryButtonFull}
						onPress={() =>
							Alert.alert(
								'Securite',
								'Toutes les autres sessions ont ete deconnectees de votre compte.',
							)
						}
					>
						<Text style={styles.secondaryButtonText}>Deconnecter les autres appareils</Text>
					</Pressable>
				</View>

				<View style={styles.logoutCard}>
					<Text style={styles.sectionTitle}>Deconnexion</Text>
					<Text style={styles.sectionDescription}>
						Quittez votre session de maniere securisee.
					</Text>
					<Pressable style={styles.logoutButton} onPress={logout}>
						<Text style={styles.logoutText}>Se deconnecter</Text>
					</Pressable>
				</View>
			</ScrollView>

			<Modal visible={pickerState.visible} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>{pickerState.title}</Text>
						<ScrollView style={styles.modalList}>
							{pickerState.options.map((option) => (
								<Pressable
									key={option}
									style={styles.modalOption}
									onPress={() => {
										pickerState.onSelect(option);
										closePicker();
									}}
								>
									<Text style={styles.modalOptionText}>{option}</Text>
								</Pressable>
							))}
						</ScrollView>
						<Pressable style={styles.modalCancel} onPress={closePicker}>
							<Text style={styles.modalCancelText}>Fermer</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

function SelectorField({
	label,
	value,
	onPress,
}: {
	label: string;
	value: string;
	onPress: () => void;
}) {
	return (
		<Pressable style={styles.selectorField} onPress={onPress}>
			<Text style={styles.selectorLabel}>{label}</Text>
			<Text style={styles.selectorValue}>{value}</Text>
		</Pressable>
	);
}

function ToggleRow({
	label,
	value,
	onValueChange,
}: {
	label: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
}) {
	return (
		<View style={styles.toggleRow}>
			<Text style={styles.toggleText}>{label}</Text>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ false: '#d1d5db', true: '#f9a8d4' }}
				thumbColor={value ? '#db2777' : '#f3f4f6'}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f0f2f5',
	},
	container: {
		paddingHorizontal: 16,
		paddingBottom: 36,
		gap: 14,
	},
	pageTitle: {
		marginTop: 8,
		fontSize: 30,
		fontWeight: '800',
		color: '#db2777',
	},
	pageSubtitle: {
		marginTop: 4,
		marginBottom: 4,
		fontSize: 14,
		lineHeight: 21,
		color: '#65676b',
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		gap: 10,
	},
	logoutCard: {
		backgroundColor: '#fef2f2',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#fecaca',
		gap: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1c1e21',
	},
	sectionDescription: {
		fontSize: 13,
		lineHeight: 19,
		color: '#65676b',
		marginBottom: 4,
	},
	avatarRow: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'center',
	},
	avatar: {
		width: 78,
		height: 78,
		borderRadius: 39,
		borderWidth: 2,
		borderColor: '#f9a8d4',
		backgroundColor: '#f3f4f6',
	},
	avatarActions: {
		flex: 1,
		gap: 8,
	},
	input: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 11,
		color: '#1c1e21',
		backgroundColor: '#f3f4f6',
	},
	multilineInput: {
		minHeight: 76,
		textAlignVertical: 'top',
	},
	primaryButton: {
		backgroundColor: '#db2777',
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 14,
	},
	secondaryButton: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 9,
		paddingHorizontal: 8,
	},
	secondaryButtonFull: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f3f4f6',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 11,
		paddingHorizontal: 10,
	},
	secondaryButtonText: {
		color: '#374151',
		fontWeight: '600',
	},
	rowButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	selectorField: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#f3f4f6',
		gap: 5,
	},
	selectorLabel: {
		fontSize: 12,
		color: '#65676b',
	},
	selectorValue: {
		fontSize: 15,
		color: '#1c1e21',
		fontWeight: '600',
	},
	infoBox: {
		marginTop: 4,
		borderRadius: 10,
		backgroundColor: '#fdf2f8',
		borderWidth: 1,
		borderColor: '#fbcfe8',
		padding: 10,
	},
	infoText: {
		color: '#9d174d',
		fontSize: 13,
		lineHeight: 18,
	},
	publicationCard: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		padding: 10,
		gap: 6,
		backgroundColor: '#ffffff',
	},
	publicationTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1c1e21',
	},
	publicationMeta: {
		fontSize: 12,
		color: '#65676b',
	},
	publicationContent: {
		fontSize: 13,
		lineHeight: 18,
		color: '#3c4043',
	},
	emptyState: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f3f4f6',
		padding: 12,
		gap: 4,
	},
	emptyStateTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#374151',
	},
	emptyStateText: {
		color: '#65676b',
		fontSize: 13,
		lineHeight: 18,
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 6,
	},
	toggleText: {
		fontSize: 14,
		color: '#1c1e21',
		flex: 1,
		paddingRight: 8,
	},
	accessList: {
		marginTop: 6,
		borderWidth: 1,
		borderColor: '#fbcfe8',
		backgroundColor: '#fdf2f8',
		borderRadius: 12,
		padding: 10,
		gap: 5,
	},
	accessListTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#9d174d',
	},
	accessListItem: {
		color: '#be185d',
		fontSize: 13,
	},
	logoutButton: {
		backgroundColor: '#dc2626',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
	},
	logoutText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 14,
		maxHeight: '70%',
		borderWidth: 1,
		borderColor: '#e5e7eb',
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1c1e21',
		marginBottom: 8,
	},
	modalList: {
		maxHeight: 320,
	},
	modalOption: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f2f5',
	},
	modalOptionText: {
		color: '#1c1e21',
		fontSize: 15,
	},
	modalCancel: {
		marginTop: 10,
		backgroundColor: '#f3f4f6',
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 11,
	},
	modalCancelText: {
		color: '#374151',
		fontWeight: '600',
	},
});
