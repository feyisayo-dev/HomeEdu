import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Pdf from 'react-native-pdf'; // Standard PDF library

const PassageScreen = ({ route, navigation }) => {
    const { sourceUri, title } = route.params;

    return (
        <View style={styles.container}>
            <Pdf
                source={{ uri: sourceUri, cache: true }}
                onLoadComplete={(numberOfPages, filePath) => {
                    console.log(`Number of pages: ${numberOfPages}`);
                }}
                onPageChanged={(page, numberOfPages) => {
                    console.log(`Current page: ${page}`);
                }}
                onError={(error) => {
                    console.log(error);
                }}
                style={styles.pdf}
                trustAllCerts={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    }
});

export default PassageScreen;