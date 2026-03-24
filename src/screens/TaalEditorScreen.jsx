import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import {
  saveCustomTaal,
  getCustomTaals,
  deleteCustomTaal,
  saveVariation,
  getVariationsForTaal,
  deleteVariation,
} from '../db/database';
import { BUILT_IN_TAALS } from '../models/taals';
import { useTheme } from '../utils/ThemeContext';

const ALL_BOLS = [
  'Dha', 'Dhin', 'Tin', 'Na', 'Ta', 'Tun', 'Ge', 'Ke',
  'Ti', 'Te', 'Kat', 'Gadi', 'Tete', 'Dhi', 'Tirakita',
  'Kda', 'Tit', 'Dhere', '-',
];

export default function TaalEditorScreen() {
  // Editor mode: 'pick' (choose taal), 'create' (new taal), 'edit' (edit existing)
  const [mode, setMode] = useState('pick');
  const [customTaals, setCustomTaals] = useState([]);

  // Taal being edited (null = creating new)
  const [editingTaal, setEditingTaal] = useState(null);
  const [isBuiltIn, setIsBuiltIn] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [theka, setTheka] = useState([]);
  const [vibhagBreaks, setVibhagBreaks] = useState([]);
  const [khaliVibhag, setKhaliVibhag] = useState([]);
  const [editingMatra, setEditingMatra] = useState(null);

  // Variations
  const [variations, setVariations] = useState([]);
  const [showVariationForm, setShowVariationForm] = useState(false);
  const [variationName, setVariationName] = useState('');
  const [variationTheka, setVariationTheka] = useState([]);
  const [editingVariationMatra, setEditingVariationMatra] = useState(null);

  const { colors } = useTheme();

  const loadCustomTaals = useCallback(async () => {
    try {
      const taals = await getCustomTaals();
      setCustomTaals(taals);
    } catch (err) {
      // DB not ready yet
    }
  }, []);

  useEffect(() => {
    loadCustomTaals();
  }, [loadCustomTaals]);

  const allTaals = [...BUILT_IN_TAALS, ...customTaals];

  // Convert a taal's vibhag array into break indices
  const vibhagToBreaks = (vibhag) => {
    const breaks = [];
    let count = 0;
    for (let i = 0; i < vibhag.length - 1; i++) {
      count += vibhag[i];
      breaks.push(count);
    }
    return breaks;
  };

  const startCreate = () => {
    setMode('create');
    setEditingTaal(null);
    setIsBuiltIn(false);
    setName('');
    setTheka([]);
    setVibhagBreaks([]);
    setKhaliVibhag([]);
    setEditingMatra(null);
    setVariations([]);
    setShowVariationForm(false);
  };

  const startEdit = async (taal) => {
    setMode('edit');
    setEditingTaal(taal);
    setIsBuiltIn(!taal.isCustom);
    setName(taal.name);
    setTheka([...taal.theka.map((m) => ({ bols: [...m.bols] }))]);
    setVibhagBreaks(vibhagToBreaks(taal.vibhag));
    setKhaliVibhag([...taal.khaliVibhag]);
    setEditingMatra(null);
    setShowVariationForm(false);

    try {
      const vars = await getVariationsForTaal(taal.id);
      setVariations(vars);
    } catch {
      setVariations([]);
    }
  };

  const backToPicker = () => {
    setMode('pick');
    setEditingTaal(null);
    loadCustomTaals();
  };

  // ── Theka editing ──

  const addMatra = (bol) => {
    if (editingMatra !== null) {
      const updated = [...theka];
      updated[editingMatra] = {
        bols: [...updated[editingMatra].bols, bol],
      };
      setTheka(updated);
    } else {
      setTheka([...theka, { bols: [bol] }]);
    }
  };

  const removeMatra = (index) => {
    setTheka(theka.filter((_, i) => i !== index));
    setVibhagBreaks(
      vibhagBreaks
        .filter((b) => b !== index)
        .map((b) => (b > index ? b - 1 : b)),
    );
    if (editingMatra === index) setEditingMatra(null);
  };

  const toggleVibhagBreak = (matraIndex) => {
    if (vibhagBreaks.includes(matraIndex)) {
      setVibhagBreaks(vibhagBreaks.filter((b) => b !== matraIndex));
    } else {
      setVibhagBreaks([...vibhagBreaks, matraIndex].sort((a, b) => a - b));
    }
  };

  const computeVibhag = () => {
    const breaks = [0, ...vibhagBreaks, theka.length];
    const sections = [];
    for (let i = 0; i < breaks.length - 1; i++) {
      sections.push(breaks[i + 1] - breaks[i]);
    }
    return sections;
  };

  const toggleKhali = (vibhagIndex) => {
    if (khaliVibhag.includes(vibhagIndex)) {
      setKhaliVibhag(khaliVibhag.filter((k) => k !== vibhagIndex));
    } else {
      setKhaliVibhag([...khaliVibhag, vibhagIndex]);
    }
  };

  // ── Variation theka editing ──

  const addVariationMatra = (bol) => {
    if (editingVariationMatra !== null) {
      const updated = [...variationTheka];
      updated[editingVariationMatra] = {
        bols: [...updated[editingVariationMatra].bols, bol],
      };
      setVariationTheka(updated);
    } else {
      setVariationTheka([...variationTheka, { bols: [bol] }]);
    }
  };

  const removeVariationMatra = (index) => {
    setVariationTheka(variationTheka.filter((_, i) => i !== index));
    if (editingVariationMatra === index) setEditingVariationMatra(null);
  };

  // ── Save ──

  const saveTaal = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the taal');
      return;
    }
    if (theka.length === 0) {
      Alert.alert('Error', 'Please add at least one matra');
      return;
    }

    const taal = {
      id: editingTaal && !isBuiltIn ? editingTaal.id : `custom_${Date.now()}`,
      name: name.trim(),
      matras: theka.length,
      vibhag: computeVibhag(),
      khaliVibhag,
      theka,
      isCustom: true,
    };

    try {
      await saveCustomTaal(taal);
      const label = mode === 'create' ? 'Created' : isBuiltIn ? 'Saved as copy' : 'Updated';
      Alert.alert(label, `${taal.name} saved successfully`);
      await loadCustomTaals();
      backToPicker();
    } catch (err) {
      Alert.alert('Error', 'Failed to save taal');
    }
  };

  const handleDeleteTaal = (taal) => {
    Alert.alert(
      'Delete Taal',
      `Delete "${taal.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomTaal(taal.id);
            await loadCustomTaals();
          },
        },
      ],
    );
  };

  // ── Variations save/delete ──

  const startVariationForm = () => {
    const taalId = editingTaal?.id;
    if (!taalId) {
      Alert.alert('Save first', 'Save the taal before adding variations.');
      return;
    }
    setShowVariationForm(true);
    setVariationName('');
    // Pre-fill variation theka with the base theka
    setVariationTheka([...theka.map((m) => ({ bols: [...m.bols] }))]);
    setEditingVariationMatra(null);
  };

  const saveVariationHandler = async () => {
    if (!variationName.trim()) {
      Alert.alert('Error', 'Please enter a name for the variation');
      return;
    }
    if (variationTheka.length === 0) {
      Alert.alert('Error', 'Variation needs at least one matra');
      return;
    }

    const taalId = editingTaal?.id || `custom_${Date.now()}`;
    const variation = {
      id: `var_${Date.now()}`,
      taalId,
      name: variationName.trim(),
      theka: variationTheka,
    };

    try {
      await saveVariation(variation);
      const vars = await getVariationsForTaal(taalId);
      setVariations(vars);
      setShowVariationForm(false);
      Alert.alert('Saved', `Variation "${variation.name}" saved`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save variation');
    }
  };

  const handleDeleteVariation = (v) => {
    Alert.alert(
      'Delete Variation',
      `Delete "${v.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVariation(v.id);
            const vars = await getVariationsForTaal(editingTaal.id);
            setVariations(vars);
          },
        },
      ],
    );
  };

  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 500;
  const styles = getStyles(colors);

  const formatVibhag = (taal) => {
    return taal.vibhag.map((v, i) => {
      const label = i === 0 ? 'X' : taal.khaliVibhag.includes(i) ? '0' : i;
      return `${label}(${v})`;
    }).join('  ');
  };

  const formatTheka = (taal) => {
    return taal.theka.map((m) => m.bols.join(' ')).join(' | ');
  };

  const renderTaalCard = (taal, isCustom) => (
    <TouchableOpacity
      key={taal.id}
      style={[styles.taalCard, isWide && styles.taalCardWide]}
      onPress={() => startEdit(taal)}
    >
      <View style={styles.taalCardTop}>
        <View style={styles.taalCardInfo}>
          <Text style={styles.taalCardName}>{taal.name}</Text>
          <Text style={styles.taalCardMeta}>
            {taal.matras} matras  {'\u00b7'}  {taal.vibhag.length} vibhags
          </Text>
        </View>
        <View style={styles.taalCardActions}>
          <Text style={styles.taalCardAction}>Edit</Text>
          {isCustom && (
            <TouchableOpacity onPress={() => handleDeleteTaal(taal)}>
              <Text style={styles.taalCardDelete}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {isWide && (
        <View style={styles.taalCardDetails}>
          <Text style={styles.taalCardVibhag}>{formatVibhag(taal)}</Text>
          <Text style={styles.taalCardTheka} numberOfLines={2}>
            {formatTheka(taal)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ── Picker screen ──
  if (mode === 'pick') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={isWide && styles.contentWide}>
        <Text style={styles.title}>Taal Editor</Text>

        <TouchableOpacity style={[styles.createButton, isWide && styles.createButtonWide]} onPress={startCreate}>
          <Text style={styles.createButtonText}>+ Create New Taal</Text>
        </TouchableOpacity>

        {/* Built-in taals */}
        <Text style={styles.sectionTitle}>Built-in Taals</Text>
        <View style={isWide ? styles.taalGrid : undefined}>
          {BUILT_IN_TAALS.map((taal) => renderTaalCard(taal, false))}
        </View>

        {/* Custom taals */}
        {customTaals.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Custom Taals
            </Text>
            <View style={isWide ? styles.taalGrid : undefined}>
              {customTaals.map((taal) => renderTaalCard(taal, true))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ── Editor screen (create / edit) ──
  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={backToPicker}>
        <Text style={styles.backButtonText}>{'\u25C0'} Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>
        {mode === 'create'
          ? 'Create Taal'
          : isBuiltIn
          ? `Edit ${editingTaal.name} (copy)`
          : `Edit ${editingTaal.name}`}
      </Text>

      {isBuiltIn && (
        <Text style={styles.builtInNote}>
          Built-in taals can't be overwritten. Changes will be saved as a new
          custom taal.
        </Text>
      )}

      {/* Name input */}
      <TextInput
        style={styles.nameInput}
        placeholder="Taal name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      {/* Current theka */}
      <Text style={styles.sectionTitle}>
        Theka ({theka.length} matras)
      </Text>
      <View style={styles.thekaRow}>
        {theka.map((matra, i) => {
          const isBreak = vibhagBreaks.includes(i);
          return (
            <View key={i} style={styles.matraWrapper}>
              {isBreak && <View style={styles.vibhagLine} />}
              <TouchableOpacity
                style={[
                  styles.matraBox,
                  editingMatra === i && styles.matraBoxEditing,
                ]}
                onPress={() =>
                  setEditingMatra(editingMatra === i ? null : i)
                }
                onLongPress={() => removeMatra(i)}
              >
                <Text style={styles.matraText}>
                  {matra.bols.join(' ')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleVibhagBreak(i)}>
                <Text style={styles.breakToggle}>
                  {isBreak ? '|' : '\u00b7'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {editingMatra !== null && (
        <Text style={styles.hint}>
          Tap a bol to add to matra {editingMatra + 1}. Tap matra again to
          deselect. Long-press to remove.
        </Text>
      )}

      {/* Khali vibhag selector */}
      {theka.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Khali Vibhags</Text>
          <View style={styles.khaliRow}>
            {computeVibhag().map((_, vi) => (
              <TouchableOpacity
                key={vi}
                style={[
                  styles.khaliButton,
                  khaliVibhag.includes(vi) && styles.khaliButtonActive,
                ]}
                onPress={() => toggleKhali(vi)}
              >
                <Text
                  style={[
                    styles.khaliButtonText,
                    khaliVibhag.includes(vi) && styles.khaliButtonTextActive,
                  ]}
                >
                  V{vi + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Bol palette */}
      <Text style={styles.sectionTitle}>Bols</Text>
      <View style={styles.bolPalette}>
        {ALL_BOLS.map((bol) => (
          <TouchableOpacity
            key={bol}
            style={styles.bolButton}
            onPress={() => addMatra(bol)}
          >
            <Text style={styles.bolText}>
              {bol === '-' ? '\u2014' : bol}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveButton} onPress={saveTaal}>
        <Text style={styles.saveButtonText}>
          {mode === 'create'
            ? 'Save Taal'
            : isBuiltIn
            ? 'Save as Custom Taal'
            : 'Update Taal'}
        </Text>
      </TouchableOpacity>

      {/* ── Variations Section ── */}
      <View style={styles.variationSection}>
        <Text style={styles.sectionTitle}>Variations</Text>
        <Text style={styles.variationHint}>
          Variations keep the same structure but use different bols.
        </Text>

        {/* Existing variations */}
        {variations.map((v) => (
          <View key={v.id} style={styles.variationCard}>
            <View style={styles.variationCardHeader}>
              <Text style={styles.variationCardName}>{v.name}</Text>
              <TouchableOpacity onPress={() => handleDeleteVariation(v)}>
                <Text style={styles.taalCardDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.variationCardTheka}>
              {v.theka.map((m) => m.bols.join(' ')).join(' | ')}
            </Text>
          </View>
        ))}

        {/* Add variation */}
        {!showVariationForm ? (
          <TouchableOpacity
            style={styles.addVariationButton}
            onPress={startVariationForm}
          >
            <Text style={styles.addVariationText}>+ Add Variation</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.variationForm}>
            <TextInput
              style={styles.nameInput}
              placeholder="Variation name (e.g. Fast, Gurmat)"
              placeholderTextColor={colors.textSecondary}
              value={variationName}
              onChangeText={setVariationName}
            />

            <Text style={[styles.sectionTitle, { fontSize: 14 }]}>
              Variation Theka ({variationTheka.length} matras)
            </Text>
            <View style={styles.thekaRow}>
              {variationTheka.map((matra, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.matraBox,
                    editingVariationMatra === i && styles.matraBoxEditing,
                  ]}
                  onPress={() =>
                    setEditingVariationMatra(
                      editingVariationMatra === i ? null : i,
                    )
                  }
                  onLongPress={() => removeVariationMatra(i)}
                >
                  <Text style={styles.matraText}>
                    {matra.bols.join(' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editingVariationMatra !== null && (
              <Text style={styles.hint}>
                Tap a bol to add to matra {editingVariationMatra + 1}.
              </Text>
            )}

            <Text style={[styles.sectionTitle, { fontSize: 14 }]}>Bols</Text>
            <View style={styles.bolPalette}>
              {ALL_BOLS.map((bol) => (
                <TouchableOpacity
                  key={bol}
                  style={styles.bolButton}
                  onPress={() => addVariationMatra(bol)}
                >
                  <Text style={styles.bolText}>
                    {bol === '-' ? '\u2014' : bol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.variationFormButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowVariationForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveVariationButton}
                onPress={saveVariationHandler}
              >
                <Text style={styles.saveButtonText}>Save Variation</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.accent,
      textAlign: 'center',
      marginBottom: 24,
    },
    backButton: {
      marginBottom: 8,
    },
    backButtonText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '600',
    },
    builtInNote: {
      color: colors.textSecondary,
      fontSize: 13,
      fontStyle: 'italic',
      textAlign: 'center',
      marginBottom: 16,
    },
    createButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 24,
    },
    createButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: 'bold',
    },
    contentWide: {
      maxWidth: 700,
      alignSelf: 'center',
      width: '100%',
    },
    taalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    taalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
    },
    taalCardWide: {
      width: '48%',
      marginBottom: 10,
    },
    taalCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    taalCardInfo: {
      flex: 1,
    },
    taalCardName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    taalCardMeta: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    taalCardDetails: {
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    taalCardVibhag: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
    },
    taalCardTheka: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    taalCardActions: {
      flexDirection: 'row',
      gap: 16,
    },
    taalCardAction: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    taalCardDelete: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '600',
    },
    createButtonWide: {
      maxWidth: 300,
      alignSelf: 'center',
    },
    nameInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      color: colors.text,
      fontSize: 18,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 12,
    },
    thekaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 16,
    },
    matraWrapper: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    vibhagLine: {
      width: 2,
      height: 40,
      backgroundColor: colors.accent,
      marginRight: 4,
    },
    matraBox: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 10,
      minWidth: 44,
      alignItems: 'center',
    },
    matraBoxEditing: {
      borderWidth: 2,
      borderColor: colors.accent,
    },
    matraText: {
      color: colors.text,
      fontSize: 14,
    },
    breakToggle: {
      color: colors.textSecondary,
      fontSize: 18,
      paddingHorizontal: 4,
    },
    hint: {
      color: colors.textSecondary,
      fontSize: 12,
      fontStyle: 'italic',
      marginBottom: 16,
    },
    khaliRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    khaliButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.buttonBg,
    },
    khaliButtonActive: {
      backgroundColor: colors.accent,
    },
    khaliButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    khaliButtonTextActive: {
      color: colors.background,
    },
    bolPalette: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    bolButton: {
      backgroundColor: colors.buttonBg,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bolText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    saveButton: {
      backgroundColor: '#27ae60',
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: 'center',
      marginBottom: 24,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    variationSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 20,
    },
    variationHint: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: 16,
    },
    variationCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    variationCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    variationCardName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    variationCardTheka: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    addVariationButton: {
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    addVariationText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    variationForm: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    variationFormButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.buttonBg,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    saveVariationButton: {
      flex: 1,
      backgroundColor: '#27ae60',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
  });
