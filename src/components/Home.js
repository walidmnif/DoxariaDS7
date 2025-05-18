import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import { FaVolumeUp, FaUpload } from "react-icons/fa";
import axios from "axios";

const NavBar = ({ handleLogout, user }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  return (
    <div className="header">
      <img src="/DoxLogo.png" alt="Dox Logo" className="logo" />
      <div className="user-icon" onClick={() => setShowDropdown(!showDropdown)}>
        <h4>{user}</h4>
        {showDropdown && (
          <div className="dropdown-menu">
            <button onClick={handleLogout}>Déconnexion</button>
          </div>
        )}
      </div>
    </div>
  );
};

const EditableCell = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value === "---" ? "" : value);

  const handleBlur = () => {
    setEditing(false);
    const finalValue = currentValue.trim() === "" ? "---" : currentValue;
    onChange(finalValue === "---" ? "" : finalValue);
  };

  return editing ? (
    <input
      autoFocus
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleBlur();
      }}
    />
  ) : (
    <span onClick={() => setEditing(true)}>
      {value === "" || value === null || value === undefined ? "---" : value}
    </span>
  );
};

const Home = (props) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("fr");
  const [extractedData, setExtractedData] = useState(null);
  const [translatedData, setTranslatedData] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState(null);
  const [documentType, setDocumentType] = useState(null);
  const [user] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [loadingTable, setLoadingTable] = useState(false);
  const [abbreviations, setAbbreviations] = useState(null);
  const [fraudDetections, setFraudDetections] = useState([]);
  const [medicalActs, setMedicalActs] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnType, setNewColumnType] = useState("text");

  const Logout = () => {
    props.handleLogout();
    navigate("/login");
  };

  useEffect(() => {
    if (language !== "fr") {
      translateData(language);
    } else {
      setTranslatedData(null);
    }
  }, [language, extractedData, medicalActs]);

  const translateData = async (selectedLang) => {
    setLoadingTranslation(true);
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/translate/", {
        extracted_data: extractedData,
        medical_acts: medicalActs,
        language: selectedLang,
      });
      setTranslatedData(response.data);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setLoadingTranslation(false);
    }
  };

  const handleImageUpload = async (event) => {
    setLoadingTable(true);
    const file = event.target.files[0];
    if (file) {
      setSelectedImageName(file.name);
      setPreviewImage(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append("image", file);
      setAbbreviations(null);
      setFraudDetections([]);
      setMedicalActs([]);

      try {
        const response = await axios.post("http://127.0.0.1:8000/api/classify_extract/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setDocumentType(response.data.type);
        setExtractedData(response.data.extracted_data || {});
        setAbbreviations(response.data.abbreviations || []);
        setFraudDetections(response.data.fraud_detections || []);
        setMedicalActs(response.data.medical_acts || []);
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'image:", error);
      } finally {
        setLoadingTable(false);
      }
    }
  };

  const readTableContent = async () => {
    const textToRead = JSON.stringify({ extracted_data: extractedData, medical_acts: medicalActs });
    try {
      await axios.post("http://127.0.0.1:8000/api/text-to-speech/", {
        phrase: textToRead,
        language,
      });
    } catch (error) {
      console.error("Erreur lors de la lecture du texte :", error);
    }
  };

  const handleEdit = (key, value, parentKey = null, index = null) => {
    if (parentKey === "medical_acts") {
      const updatedActs = [...medicalActs];
      updatedActs[index][key] = value;
      setMedicalActs(updatedActs);
    } else if (parentKey === "details") {
      const updatedActs = [...medicalActs];
      updatedActs[index[0]].details[index[1]][key] = value;
      setMedicalActs(updatedActs);
    } else {
      const updated = { ...extractedData, [key]: value };
      setExtractedData(updated);
    }
  };

  const saveDocument = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/api/save-scanned-document/", {
        user: props.user,
        document_type: documentType || "unknown",
        detected_fields: extractedData,
        medical_acts: medicalActs,
        status: "pending",
      });
      alert("Document saved successfully!");
    } catch (error) {
      console.error("Error saving document:", error);
      alert("An error occurred while saving the document.");
    }
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const updatedExtracted = { ...(translatedData?.extracted_data || extractedData) };
    const updatedActs = [...(translatedData?.medical_acts || medicalActs)];

    if (newColumnType === "array") {
      updatedExtracted[newColumnName] = medicalActs.map(() => ({}));
    } else {
      updatedExtracted[newColumnName] = "";
    }

    if (translatedData) {
      setTranslatedData({ extracted_data: updatedExtracted, medical_acts: updatedActs });
    } else {
      setExtractedData(updatedExtracted);
      setMedicalActs(updatedActs);
    }

    setNewColumnName("");
    setShowAddColumnModal(false);
  };

  const displayData = translatedData?.extracted_data || extractedData || {};
  const displayActs = translatedData?.medical_acts || medicalActs || [];

  const formatKey = (key) => {
    const keyMap = {
      "matriculeadherant": "Matricule Adhérent",
      "nomprenomadherant": "Nom Prénom Adhérent",
      "datedenaissancestar": "Date de Naissance",
      "matriculecnam": "Matricule CNAM",
      "nom et prenom": "Nom et Prénom",
      "matriculefiscal": "Matricule Fiscal",
      "adresse": "Adresse",
      "ID": "ID"
    };
    return keyMap[key] || key;
  };

  return (
    <div>
      <NavBar handleLogout={Logout} user={props.user} />
      <div className="home-container">
        <div className="upload-section">
          {previewImage ? (
            <div className="preview-container" style={{ position: "relative" }}>
              <img
                src={previewImage}
                alt="uploaded preview"
                className="preview-image"
                onClick={() => setPreviewMode(true)}
              />
              {previewMode && (
                <div className="lightbox" onClick={() => setPreviewMode(false)}>
                  <img
                    src={previewImage}
                    alt="Full screen"
                    className="lightbox-image"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          ) : (
            <p>Téléversez votre image pour extraire les données...</p>
          )}
          <div className="upload-buttons">
            <label className="btn upload-document">
              <FaUpload /> Téléverser une image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        {selectedImageName ? (
          loadingTable ? (
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="data-container">
              <div className="container-row">
                <div className="data-box">
                  <div className="title-select">
                    {documentType && (
                      <p>Type de document: <strong>{documentType}</strong></p>
                    )}
                    {documentType === "Bulletin de soin" && (
                      <select onChange={(e) => setLanguage(e.target.value)} value={language}>
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                        <option value="en">Anglais</option>
                      </select>
                    )}
                  </div>
                  {documentType === "Bulletin de soin" ? (
                    <>
                      <h3>Données extraites</h3>
                      {loadingTranslation ? (
                        <div className="spinner-container">
                          <div className="spinner"></div>
                        </div>
                      ) : (
                        <>
                          <table className="structured-table">
                            <thead>
                              <tr>
                                {Object.keys(displayData).map((key) => (
                                  <th key={key}>{formatKey(key)}</th>
                                ))}
                                {displayActs.length > 0 && (
                                  <>
                                    <th>Date</th>
                                    <th>Désignation</th>
                                    <th>Honoraire</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {Object.entries(displayData).map(([key, value]) => (
                                  <td key={key}>
                                    <EditableCell
                                      value={value || "---"}
                                      onChange={(val) => handleEdit(key, val)}
                                    />
                                  </td>
                                ))}
                                {displayActs.length > 0 ? (
                                  <>
                                    <td>
                                      {displayActs.map((act, i) => (
                                        <div key={`date-${i}`}>
                                          <EditableCell
                                            value={act.date || "---"}
                                            onChange={(val) => handleEdit("date", val, "medical_acts", i)}
                                          />
                                        </div>
                                      ))}
                                    </td>
                                    <td>
                                      {displayActs.map((act, i) => (
                                        <div key={`designation-${i}`}>
                                          {act.details
                                            ?.filter(d => d.type === "designation")
                                            .map((d, j) => (
                                              <EditableCell
                                                key={`designation-${i}-${j}`}
                                                value={d.value || "---"}
                                                onChange={(val) => handleEdit("value", val, "details", [i, j])}
                                              />
                                            ))}
                                          {(!act.details || act.details.filter(d => d.type === "designation").length === 0) && (
                                            <EditableCell
                                              value="---"
                                              onChange={(val) => {
                                                const newDetails = [...(act.details || []), { type: "designation", value: val }];
                                                handleEdit("details", newDetails, "medical_acts", i);
                                              }}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </td>
                                    <td>
                                      {displayActs.map((act, i) => (
                                        <div key={`honoraire-${i}`}>
                                          {act.details
                                            ?.filter(d => d.type === "honoraire")
                                            .map((d, j) => (
                                              <EditableCell
                                                key={`honoraire-${i}-${j}`}
                                                value={d.value || "---"}
                                                onChange={(val) => handleEdit("value", val, "details", [i, j])}
                                              />
                                            ))}
                                          {(!act.details || act.details.filter(d => d.type === "honoraire").length === 0) && (
                                            <EditableCell
                                              value="---"
                                              onChange={(val) => {
                                                const newDetails = [...(act.details || []), { type: "honoraire", value: val }];
                                                handleEdit("details", newDetails, "medical_acts", i);
                                              }}
                                            />
                                          )}
                                        </div>
                                      ))}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td>
                                      <EditableCell
                                        value="---"
                                        onChange={(val) => setMedicalActs([{ date: val, details: [] }])}
                                      />
                                    </td>
                                    <td>
                                      <EditableCell
                                        value="---"
                                        onChange={(val) => setMedicalActs([{ date: "", details: [{ type: "designation", value: val }] }])}
                                      />
                                    </td>
                                    <td>
                                      <EditableCell
                                        value="---"
                                        onChange={(val) => setMedicalActs([{ date: "", details: [{ type: "honoraire", value: val }] }])}
                                      />
                                    </td>
                                  </>
                                )}
                              </tr>
                            </tbody>
                          </table>

                          {abbreviations && abbreviations.length > 0 && (
                            <div className="abreviations-list">
                              <h4>Abbréviations détectées :</h4>
                              <ul>
                                {abbreviations.map((abbr, index) => {
                                  const [key, value] = Object.entries(abbr)[0];
                                  return (
                                    <li key={index}>
                                      <strong>{key}</strong> : {value}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {fraudDetections.some(d => d.is_fraud) && (
                            <div className="fraud-detections-section">
                              <h3>Détections de fraude</h3>
                              <div className="fraud-detections-grid">
                                {fraudDetections
                                  .filter(detection => detection.is_fraud)
                                  .map((detection, index) => (
                                    <div key={index} className="fraud-detection-card">
                                      {detection.cropped_image && (
                                        <div className="fraud-image-container">
                                          <img
                                            src={`data:image/jpeg;base64,${detection.cropped_image}`}
                                            alt={`Détection de fraude - ${detection.field}`}
                                            className="fraud-image"
                                          />
                                        </div>
                                      )}
                                      <div className="fraud-details">
                                        <h4>{detection.field === "date" ? "Date suspecte" : "Honoraire suspect"}</h4>
                                        <p>Valeur: {detection.value}</p>
                                        <p>Statut: Fraude détectée avec  {detection.fraud_probability.toFixed(2)}% de confiance</p>
                                      </div>
                                      
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {(!fraudDetections || fraudDetections.length === 0 || !fraudDetections.some(d => d.is_fraud)) && (
                            <div className="fraudAlert normal">
                              <div className="fraud-content">
                                <h3>Risque de fraude inexistant</h3>
                                <p>Aucun indicateur de fraude détecté.</p>
                              </div>
                            </div>
                          )}

                          <div className="save-button-container">
                            <button className="save-button" onClick={saveDocument}>Enregistrer</button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="other-document-message">
                      <p>Document de type: {documentType}</p>
                      {displayData && Object.keys(displayData).length > 0 && (
                        <div className="simple-data-display">
                          <h4>Données extraites:</h4>
                          <ul>
                            {Object.entries(displayData).map(([key, value]) => (
                              <li key={key}>
                                <strong>{formatKey(key)}:</strong> {value || "---"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {documentType === "Bulletin de soin" && (
                  <div className="icons-container">
                    <FaVolumeUp className="icon" title="Lire à haute voix" onClick={readTableContent} />
                    
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div>Téléversez un document pour voir plus de détails...</div>
        )}
        {showAddColumnModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Ajouter une nouvelle colonne</h3>
              <div className="modal-input-group">
                <label>Nom de la colonne:</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Entrez le nom de la colonne"
                />
              </div>
              <div className="modal-input-group">
                <label>Type de colonne:</label>
                <select
                  value={newColumnType}
                  onChange={(e) => setNewColumnType(e.target.value)}
                >
                  <option value="text">Valeur simple</option>
                  <option value="array">Tableau d'objets</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button onClick={() => setShowAddColumnModal(false)}>Annuler</button>
                <button onClick={handleAddColumn}>Ajouter</button>
              </div>
            </div>
          </div>
        )}
        <footer className="footer">Par: DataWizards</footer>
      </div>
    </div>
  );
};

export default Home;

/**
 <button
                      className="add-column-button"
                      onClick={() => setShowAddColumnModal(true)}
                    >
                      + Ajouter Colonne
                    </button>
 */