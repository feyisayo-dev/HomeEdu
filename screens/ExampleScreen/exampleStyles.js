import { StyleSheet, Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FB',
        paddingTop: Platform.OS === 'android' ? 40 : 60,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header & Progress
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    subtopicsTitle: {
        fontSize: 22,
        color: '#1a1a1a',
        textAlign: 'center',
        fontFamily: 'milkyCustom',
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 10,
        letterSpacing: 1,
    },
    progressContainer: { width: '100%', alignItems: 'center' },
    progressText: { color: '#666', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
    progressBarBackground: {
        width: '100%', height: 12, backgroundColor: '#e0e0e0',
        borderRadius: 6, borderWidth: 2, borderColor: '#000', overflow: 'hidden',
    },
    progressBarFill: { height: '100%', backgroundColor: '#FFD93D' },

    // The Main Card
    cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        width: SCREEN_WIDTH * 0.9,
        height: '85%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: "#000",
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    cardScrollContent: { paddingBottom: 20, flexGrow: 1 },
    
    // Card Internal Elements
    instructionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#864AF9',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    image: {
        width: '100%', height: 200, borderRadius: 12,
        resizeMode: 'contain', marginBottom: 15,
        borderWidth: 2, borderColor: '#000',
    },

    // Navigation Buttons
    navControls: {
        flexDirection: 'row', justifyContent: 'space-between',
        padding: 25, paddingBottom: 40,
    },
    navButton: {
        paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
        backgroundColor: '#ffffff', borderWidth: 3, borderColor: '#000',
        shadowColor: "#000", shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1, shadowRadius: 0, minWidth: 100, alignItems: 'center',
    },
    nextButton: { backgroundColor: '#864AF9' },
    finishButton: { backgroundColor: '#10b981' },
    navButtonText: { fontSize: 16, fontWeight: '900', color: '#000', textTransform: 'uppercase' },

    // Custom Tables & Text (From your old file)
    scrollContainer: { marginVertical: 10 },
    table: { borderWidth: 2, borderColor: '#000', borderRadius: 8, overflow: 'hidden' },
    tableRow: { flexDirection: 'row' },
    headerCell: {
        minWidth: 120, paddingVertical: 12, paddingHorizontal: 8,
        backgroundColor: '#f0f0f0', borderRightWidth: 2, borderBottomWidth: 2,
        borderColor: '#000', alignItems: 'center', justifyContent: 'center',
    },
    headerText: { fontWeight: '900', textAlign: 'center', fontSize: 14 },
    tableCell: {
        minWidth: 120, padding: 8, borderRightWidth: 2, borderBottomWidth: 2,
        borderColor: '#000', alignItems: 'center', justifyContent: 'center',
    },
    cellBox: {
        paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#eee',
        borderRadius: 4, marginHorizontal: 2, borderWidth: 1, borderColor: '#ccc',
    },
    cellText: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#333' },
    horizontalItems: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
    paragraphText: { fontSize: 17, lineHeight: 26, color: '#222', paddingVertical: 4 },
    bulletItem: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 10, marginBottom: 6 },
    bulletDot: { fontSize: 16, color: '#864AF9', marginRight: 8, lineHeight: 24, fontWeight: '900' },
    bulletText: { flex: 1, fontSize: 16, color: '#333', lineHeight: 24 },
});

export default styles;