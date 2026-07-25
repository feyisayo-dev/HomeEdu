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

    // Header
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
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    progressBarBackground: {
        width: '100%',
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#000',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFD93D',
    },

    // Card
    cardArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: SCREEN_WIDTH * 0.9,
        height: '82%',
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
    cardCorner: {
        position: 'absolute',
        top: 10, right: 10,
        width: 15, height: 15,
        borderRadius: 15,
        backgroundColor: '#FF6B6B',
        borderWidth: 2,
        borderColor: '#000',
    },
    cardScrollContent: {
        paddingBottom: 20,
        flexGrow: 1,
        justifyContent: 'center',
    },

    // Content
    paragraphText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#222',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    image: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        resizeMode: 'contain',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#000',
    },
    videoContainer: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        borderWidth: 2,
        borderColor: '#000',
    },
    video: { width: '100%', height: '100%' },

    // Audio card
    audioContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        width: '100%',
    },
    playButton: { marginTop: 10, padding: 8 },
    playIcon: { fontSize: 28 },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: '#eee',
        borderRadius: 3,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#864AF9',
        borderRadius: 3,
    },
    captionWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 18,
    },
    word: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1A2A4A',
        opacity: 0.4,
    },
    wordSpoken: { opacity: 1 },
    wordActive: {
        opacity: 1,
        color: '#864AF9',
        textDecorationLine: 'underline',
    },

    // Buttons
    navControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 25,
        paddingBottom: 40,
    },
    navButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        minWidth: 100,
        alignItems: 'center',
    },
    nextButton: { backgroundColor: '#864AF9' },
    finishButton: { backgroundColor: '#10b981' },
    navButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        textTransform: 'uppercase',
    },

    // Table
    tableScroll: { marginVertical: 15 },
    table: { borderWidth: 2, borderColor: '#000' },
    tableRow: { flexDirection: 'row' },
    headerCell: {
        width: 110, padding: 12,
        backgroundColor: '#f0f0f0',
        borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#000',
        alignItems: 'center'
    },
    tableCell: {
        width: 110, padding: 12,
        borderRightWidth: 2, borderColor: '#000',
        alignItems: 'center'
    },
    headerText: { fontWeight: '900', fontSize: 14 },
    cellText: { fontSize: 14, fontWeight: '500' },
    horizontalItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    cellBox: { padding: 4, margin: 2, backgroundColor: '#eee', borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
});

export default styles;
