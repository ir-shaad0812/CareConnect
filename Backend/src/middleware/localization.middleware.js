// ============================================
// LOCALIZATION MIDDLEWARE
// Handles language detection and response translations
// Provides multi-language support for API responses
// Supports: en, ne, hi, ur (RTL), ar (RTL)
// ============================================

// Supported languages (no Spanish per requirements)
export const SUPPORTED_LANGUAGES = ['en', 'ne', 'hi', 'ur', 'ar'];
export const RTL_LANGUAGES = ['ur', 'ar'];
export const DEFAULT_LANGUAGE = 'en';

// Translation messages for API responses
const translations = {
  en: {
    // Auth messages
    auth: {
      loginSuccess: 'Login successful',
      loginFailed: 'Invalid email or password',
      registerSuccess: 'Registration successful. Please verify your email.',
      logoutSuccess: 'Logout successful',
      tokenExpired: 'Session expired. Please login again.',
      tokenInvalid: 'Invalid authentication token',
      tokenRefreshed: 'Token refreshed successfully',
      emailVerified: 'Email verified successfully',
      emailAlreadyVerified: 'Email is already verified',
      verificationEmailSent: 'Verification email sent',
      passwordResetSent: 'Password reset instructions sent to your email',
      passwordResetSuccess: 'Password reset successful',
      invalidResetToken: 'Invalid or expired reset token',
      accountLocked: 'Account is locked. Please contact support.',
      accountPending: 'Account is pending approval',
      accessDenied: 'Access denied. Insufficient permissions.',
    },
    // User messages
    user: {
      profileUpdated: 'Profile updated successfully',
      profileFetched: 'Profile fetched successfully',
      userNotFound: 'User not found',
      emailExists: 'Email already registered',
      phoneExists: 'Phone number already registered',
      passwordChanged: 'Password changed successfully',
      avatarUpdated: 'Avatar updated successfully',
    },
    // Document messages
    document: {
      uploadSuccess: 'Document uploaded successfully',
      uploadFailed: 'Failed to upload document',
      fetchSuccess: 'Documents fetched successfully',
      deleteSuccess: 'Document deleted successfully',
      notFound: 'Document not found',
      verifySuccess: 'Document verified successfully',
      rejectSuccess: 'Document rejected',
      alreadyExists: 'Document of this type already exists',
    },
    // Admin messages
    admin: {
      usersFetched: 'Users fetched successfully',
      userUpdated: 'User updated successfully',
      userDeleted: 'User deleted successfully',
      documentsFetched: 'Documents fetched successfully',
      statsSuccess: 'Statistics fetched successfully',
    },
    // Common messages
    common: {
      success: 'Operation successful',
      error: 'An error occurred',
      notFound: 'Resource not found',
      badRequest: 'Invalid request',
      serverError: 'Internal server error',
      validationError: 'Validation error',
      unauthorized: 'Unauthorized access',
      forbidden: 'Access forbidden',
      tooManyRequests: 'Too many requests. Please try again later.',
    },
  },
  es: {
    auth: {
      loginSuccess: 'Inicio de sesión exitoso',
      loginFailed: 'Email o contraseña inválidos',
      registerSuccess: 'Registro exitoso. Por favor verifica tu email.',
      logoutSuccess: 'Cierre de sesión exitoso',
      tokenExpired: 'Sesión expirada. Por favor inicia sesión de nuevo.',
      tokenInvalid: 'Token de autenticación inválido',
      tokenRefreshed: 'Token actualizado exitosamente',
      emailVerified: 'Email verificado exitosamente',
      emailAlreadyVerified: 'El email ya está verificado',
      verificationEmailSent: 'Email de verificación enviado',
      passwordResetSent: 'Instrucciones de restablecimiento enviadas a tu email',
      passwordResetSuccess: 'Contraseña restablecida exitosamente',
      invalidResetToken: 'Token de restablecimiento inválido o expirado',
      accountLocked: 'Cuenta bloqueada. Por favor contacta soporte.',
      accountPending: 'Cuenta pendiente de aprobación',
      accessDenied: 'Acceso denegado. Permisos insuficientes.',
    },
    user: {
      profileUpdated: 'Perfil actualizado exitosamente',
      profileFetched: 'Perfil obtenido exitosamente',
      userNotFound: 'Usuario no encontrado',
      emailExists: 'Email ya registrado',
      phoneExists: 'Número de teléfono ya registrado',
      passwordChanged: 'Contraseña cambiada exitosamente',
      avatarUpdated: 'Avatar actualizado exitosamente',
    },
    document: {
      uploadSuccess: 'Documento subido exitosamente',
      uploadFailed: 'Error al subir documento',
      fetchSuccess: 'Documentos obtenidos exitosamente',
      deleteSuccess: 'Documento eliminado exitosamente',
      notFound: 'Documento no encontrado',
      verifySuccess: 'Documento verificado exitosamente',
      rejectSuccess: 'Documento rechazado',
      alreadyExists: 'Ya existe un documento de este tipo',
    },
    admin: {
      usersFetched: 'Usuarios obtenidos exitosamente',
      userUpdated: 'Usuario actualizado exitosamente',
      userDeleted: 'Usuario eliminado exitosamente',
      documentsFetched: 'Documentos obtenidos exitosamente',
      statsSuccess: 'Estadísticas obtenidas exitosamente',
    },
    common: {
      success: 'Operación exitosa',
      error: 'Ocurrió un error',
      notFound: 'Recurso no encontrado',
      badRequest: 'Solicitud inválida',
      serverError: 'Error interno del servidor',
      validationError: 'Error de validación',
      unauthorized: 'Acceso no autorizado',
      forbidden: 'Acceso prohibido',
      tooManyRequests: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    },
  },
  fr: {
    auth: {
      loginSuccess: 'Connexion réussie',
      loginFailed: 'Email ou mot de passe invalide',
      registerSuccess: 'Inscription réussie. Veuillez vérifier votre email.',
      logoutSuccess: 'Déconnexion réussie',
      tokenExpired: 'Session expirée. Veuillez vous reconnecter.',
      tokenInvalid: 'Token d\'authentification invalide',
      tokenRefreshed: 'Token actualisé avec succès',
      emailVerified: 'Email vérifié avec succès',
      emailAlreadyVerified: 'L\'email est déjà vérifié',
      verificationEmailSent: 'Email de vérification envoyé',
      passwordResetSent: 'Instructions de réinitialisation envoyées à votre email',
      passwordResetSuccess: 'Mot de passe réinitialisé avec succès',
      invalidResetToken: 'Token de réinitialisation invalide ou expiré',
      accountLocked: 'Compte verrouillé. Veuillez contacter le support.',
      accountPending: 'Compte en attente d\'approbation',
      accessDenied: 'Accès refusé. Permissions insuffisantes.',
    },
    user: {
      profileUpdated: 'Profil mis à jour avec succès',
      profileFetched: 'Profil récupéré avec succès',
      userNotFound: 'Utilisateur non trouvé',
      emailExists: 'Email déjà enregistré',
      phoneExists: 'Numéro de téléphone déjà enregistré',
      passwordChanged: 'Mot de passe changé avec succès',
      avatarUpdated: 'Avatar mis à jour avec succès',
    },
    document: {
      uploadSuccess: 'Document téléchargé avec succès',
      uploadFailed: 'Échec du téléchargement',
      fetchSuccess: 'Documents récupérés avec succès',
      deleteSuccess: 'Document supprimé avec succès',
      notFound: 'Document non trouvé',
      verifySuccess: 'Document vérifié avec succès',
      rejectSuccess: 'Document rejeté',
      alreadyExists: 'Un document de ce type existe déjà',
    },
    admin: {
      usersFetched: 'Utilisateurs récupérés avec succès',
      userUpdated: 'Utilisateur mis à jour avec succès',
      userDeleted: 'Utilisateur supprimé avec succès',
      documentsFetched: 'Documents récupérés avec succès',
      statsSuccess: 'Statistiques récupérées avec succès',
    },
    common: {
      success: 'Opération réussie',
      error: 'Une erreur s\'est produite',
      notFound: 'Ressource non trouvée',
      badRequest: 'Requête invalide',
      serverError: 'Erreur interne du serveur',
      validationError: 'Erreur de validation',
      unauthorized: 'Accès non autorisé',
      forbidden: 'Accès interdit',
      tooManyRequests: 'Trop de requêtes. Réessayez plus tard.',
    },
  },
  de: {
    auth: {
      loginSuccess: 'Anmeldung erfolgreich',
      loginFailed: 'Ungültige E-Mail oder Passwort',
      registerSuccess: 'Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mail.',
      logoutSuccess: 'Abmeldung erfolgreich',
      tokenExpired: 'Sitzung abgelaufen. Bitte erneut anmelden.',
      tokenInvalid: 'Ungültiger Authentifizierungstoken',
      tokenRefreshed: 'Token erfolgreich aktualisiert',
      emailVerified: 'E-Mail erfolgreich verifiziert',
      emailAlreadyVerified: 'E-Mail ist bereits verifiziert',
      verificationEmailSent: 'Verifizierungs-E-Mail gesendet',
      passwordResetSent: 'Passwort-Zurücksetzung an Ihre E-Mail gesendet',
      passwordResetSuccess: 'Passwort erfolgreich zurückgesetzt',
      invalidResetToken: 'Ungültiger oder abgelaufener Reset-Token',
      accountLocked: 'Konto gesperrt. Bitte kontaktieren Sie den Support.',
      accountPending: 'Konto wartet auf Genehmigung',
      accessDenied: 'Zugriff verweigert. Unzureichende Berechtigungen.',
    },
    user: {
      profileUpdated: 'Profil erfolgreich aktualisiert',
      profileFetched: 'Profil erfolgreich abgerufen',
      userNotFound: 'Benutzer nicht gefunden',
      emailExists: 'E-Mail bereits registriert',
      phoneExists: 'Telefonnummer bereits registriert',
      passwordChanged: 'Passwort erfolgreich geändert',
      avatarUpdated: 'Avatar erfolgreich aktualisiert',
    },
    document: {
      uploadSuccess: 'Dokument erfolgreich hochgeladen',
      uploadFailed: 'Hochladen fehlgeschlagen',
      fetchSuccess: 'Dokumente erfolgreich abgerufen',
      deleteSuccess: 'Dokument erfolgreich gelöscht',
      notFound: 'Dokument nicht gefunden',
      verifySuccess: 'Dokument erfolgreich verifiziert',
      rejectSuccess: 'Dokument abgelehnt',
      alreadyExists: 'Ein Dokument dieses Typs existiert bereits',
    },
    admin: {
      usersFetched: 'Benutzer erfolgreich abgerufen',
      userUpdated: 'Benutzer erfolgreich aktualisiert',
      userDeleted: 'Benutzer erfolgreich gelöscht',
      documentsFetched: 'Dokumente erfolgreich abgerufen',
      statsSuccess: 'Statistiken erfolgreich abgerufen',
    },
    common: {
      success: 'Operation erfolgreich',
      error: 'Ein Fehler ist aufgetreten',
      notFound: 'Ressource nicht gefunden',
      badRequest: 'Ungültige Anfrage',
      serverError: 'Interner Serverfehler',
      validationError: 'Validierungsfehler',
      unauthorized: 'Nicht autorisierter Zugriff',
      forbidden: 'Zugriff verboten',
      tooManyRequests: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
    },
  },
  hi: {
    auth: {
      loginSuccess: 'लॉगिन सफल',
      loginFailed: 'अमान्य ईमेल या पासवर्ड',
      registerSuccess: 'पंजीकरण सफल। कृपया अपना ईमेल सत्यापित करें।',
      logoutSuccess: 'लॉगआउट सफल',
      tokenExpired: 'सत्र समाप्त। कृपया फिर से लॉगिन करें।',
      tokenInvalid: 'अमान्य प्रमाणीकरण टोकन',
      tokenRefreshed: 'टोकन सफलतापूर्वक अपडेट किया गया',
      emailVerified: 'ईमेल सफलतापूर्वक सत्यापित',
      emailAlreadyVerified: 'ईमेल पहले से सत्यापित है',
      verificationEmailSent: 'सत्यापन ईमेल भेजा गया',
      passwordResetSent: 'पासवर्ड रीसेट निर्देश आपके ईमेल पर भेजे गए',
      passwordResetSuccess: 'पासवर्ड सफलतापूर्वक रीसेट किया गया',
      invalidResetToken: 'अमान्य या समाप्त रीसेट टोकन',
      accountLocked: 'खाता बंद है। कृपया सहायता से संपर्क करें।',
      accountPending: 'खाता अनुमोदन की प्रतीक्षा में',
      accessDenied: 'पहुंच अस्वीकृत। अपर्याप्त अनुमतियां।',
    },
    user: {
      profileUpdated: 'प्रोफ़ाइल सफलतापूर्वक अपडेट किया गया',
      profileFetched: 'प्रोफ़ाइल सफलतापूर्वक प्राप्त',
      userNotFound: 'उपयोगकर्ता नहीं मिला',
      emailExists: 'ईमेल पहले से पंजीकृत है',
      phoneExists: 'फोन नंबर पहले से पंजीकृत है',
      passwordChanged: 'पासवर्ड सफलतापूर्वक बदला गया',
      avatarUpdated: 'अवतार सफलतापूर्वक अपडेट किया गया',
    },
    document: {
      uploadSuccess: 'दस्तावेज़ सफलतापूर्वक अपलोड किया गया',
      uploadFailed: 'दस्तावेज़ अपलोड करने में विफल',
      fetchSuccess: 'दस्तावेज़ सफलतापूर्वक प्राप्त',
      deleteSuccess: 'दस्तावेज़ सफलतापूर्वक हटाया गया',
      notFound: 'दस्तावेज़ नहीं मिला',
      verifySuccess: 'दस्तावेज़ सफलतापूर्वक सत्यापित',
      rejectSuccess: 'दस्तावेज़ अस्वीकृत',
      alreadyExists: 'इस प्रकार का दस्तावेज़ पहले से मौजूद है',
    },
    admin: {
      usersFetched: 'उपयोगकर्ता सफलतापूर्वक प्राप्त',
      userUpdated: 'उपयोगकर्ता सफलतापूर्वक अपडेट',
      userDeleted: 'उपयोगकर्ता सफलतापूर्वक हटाया गया',
      documentsFetched: 'दस्तावेज़ सफलतापूर्वक प्राप्त',
      statsSuccess: 'आंकड़े सफलतापूर्वक प्राप्त',
    },
    common: {
      success: 'ऑपरेशन सफल',
      error: 'एक त्रुटि हुई',
      notFound: 'संसाधन नहीं मिला',
      badRequest: 'अमान्य अनुरोध',
      serverError: 'आंतरिक सर्वर त्रुटि',
      validationError: 'सत्यापन त्रुटि',
      unauthorized: 'अनधिकृत पहुंच',
      forbidden: 'पहुंच निषिद्ध',
      tooManyRequests: 'बहुत अधिक अनुरोध। कृपया बाद में पुनः प्रयास करें।',
    },
  },
  ne: {
    auth: {
      loginSuccess: 'लगइन सफल भयो',
      loginFailed: 'अमान्य इमेल वा पासवर्ड',
      registerSuccess: 'दर्ता सफल भयो। कृपया आफ्नो इमेल प्रमाणित गर्नुहोस्।',
      logoutSuccess: 'लगआउट सफल भयो',
      tokenExpired: 'सत्र समाप्त भयो। कृपया फेरि लगइन गर्नुहोस्।',
      tokenInvalid: 'अमान्य प्रमाणीकरण टोकन',
      tokenRefreshed: 'टोकन सफलतापूर्वक अपडेट गरियो',
      emailVerified: 'इमेल सफलतापूर्वक प्रमाणित गरियो',
      emailAlreadyVerified: 'इमेल पहिले नै प्रमाणित छ',
      verificationEmailSent: 'प्रमाणीकरण इमेल पठाइयो',
      passwordResetSent: 'पासवर्ड रिसेट निर्देशनहरू तपाईंको इमेलमा पठाइयो',
      passwordResetSuccess: 'पासवर्ड सफलतापूर्वक रिसेट गरियो',
      invalidResetToken: 'अमान्य वा समाप्त रिसेट टोकन',
      accountLocked: 'खाता लक गरिएको छ। कृपया सहायतासँग सम्पर्क गर्नुहोस्।',
      accountPending: 'खाता अनुमोदनको प्रतीक्षामा छ',
      accessDenied: 'पहुँच अस्वीकृत। अपर्याप्त अनुमतिहरू।',
    },
    user: {
      profileUpdated: 'प्रोफाइल सफलतापूर्वक अपडेट गरियो',
      profileFetched: 'प्रोफाइल सफलतापूर्वक प्राप्त गरियो',
      userNotFound: 'प्रयोगकर्ता फेला परेन',
      emailExists: 'इमेल पहिले नै दर्ता गरिएको छ',
      phoneExists: 'फोन नम्बर पहिले नै दर्ता गरिएको छ',
      passwordChanged: 'पासवर्ड सफलतापूर्वक परिवर्तन गरियो',
      avatarUpdated: 'अवतार सफलतापूर्वक अपडेट गरियो',
    },
    document: {
      uploadSuccess: 'कागजात सफलतापूर्वक अपलोड गरियो',
      uploadFailed: 'कागजात अपलोड गर्न असफल भयो',
      fetchSuccess: 'कागजातहरू सफलतापूर्वक प्राप्त गरियो',
      deleteSuccess: 'कागजात सफलतापूर्वक मेटाइयो',
      notFound: 'कागजात फेला परेन',
      verifySuccess: 'कागजात सफलतापूर्वक प्रमाणित गरियो',
      rejectSuccess: 'कागजात अस्वीकृत गरियो',
      alreadyExists: 'यस प्रकारको कागजात पहिले नै अवस्थित छ',
    },
    admin: {
      usersFetched: 'प्रयोगकर्ताहरू सफलतापूर्वक प्राप्त गरियो',
      userUpdated: 'प्रयोगकर्ता सफलतापूर्वक अपडेट गरियो',
      userDeleted: 'प्रयोगकर्ता सफलतापूर्वक मेटाइयो',
      documentsFetched: 'कागजातहरू सफलतापूर्वक प्राप्त गरियो',
      statsSuccess: 'तथ्याङ्कहरू सफलतापूर्वक प्राप्त गरियो',
    },
    common: {
      success: 'कार्य सफल भयो',
      error: 'त्रुटि भयो',
      notFound: 'स्रोत फेला परेन',
      badRequest: 'अमान्य अनुरोध',
      serverError: 'आन्तरिक सर्भर त्रुटि',
      validationError: 'प्रमाणीकरण त्रुटि',
      unauthorized: 'अनधिकृत पहुँच',
      forbidden: 'पहुँच निषेधित',
      tooManyRequests: 'धेरै अनुरोधहरू। कृपया पछि पुन: प्रयास गर्नुहोस्।',
    },
  },
  ar: {
    auth: {
      loginSuccess: 'تم تسجيل الدخول بنجاح',
      loginFailed: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      registerSuccess: 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني.',
      logoutSuccess: 'تم تسجيل الخروج بنجاح',
      tokenExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      tokenInvalid: 'رمز المصادقة غير صالح',
      tokenRefreshed: 'تم تحديث الرمز بنجاح',
      emailVerified: 'تم التحقق من البريد الإلكتروني بنجاح',
      emailAlreadyVerified: 'البريد الإلكتروني تم التحقق منه بالفعل',
      verificationEmailSent: 'تم إرسال بريد التحقق',
      passwordResetSent: 'تم إرسال تعليمات إعادة تعيين كلمة المرور',
      passwordResetSuccess: 'تم إعادة تعيين كلمة المرور بنجاح',
      invalidResetToken: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية',
      accountLocked: 'الحساب مقفل. يرجى الاتصال بالدعم.',
      accountPending: 'الحساب في انتظار الموافقة',
      accessDenied: 'تم رفض الوصول. صلاحيات غير كافية.',
    },
    user: {
      profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
      profileFetched: 'تم جلب الملف الشخصي بنجاح',
      userNotFound: 'المستخدم غير موجود',
      emailExists: 'البريد الإلكتروني مسجل بالفعل',
      phoneExists: 'رقم الهاتف مسجل بالفعل',
      passwordChanged: 'تم تغيير كلمة المرور بنجاح',
      avatarUpdated: 'تم تحديث الصورة الرمزية بنجاح',
    },
    document: {
      uploadSuccess: 'تم رفع المستند بنجاح',
      uploadFailed: 'فشل رفع المستند',
      fetchSuccess: 'تم جلب المستندات بنجاح',
      deleteSuccess: 'تم حذف المستند بنجاح',
      notFound: 'المستند غير موجود',
      verifySuccess: 'تم التحقق من المستند بنجاح',
      rejectSuccess: 'تم رفض المستند',
      alreadyExists: 'يوجد مستند من هذا النوع بالفعل',
    },
    admin: {
      usersFetched: 'تم جلب المستخدمين بنجاح',
      userUpdated: 'تم تحديث المستخدم بنجاح',
      userDeleted: 'تم حذف المستخدم بنجاح',
      documentsFetched: 'تم جلب المستندات بنجاح',
      statsSuccess: 'تم جلب الإحصائيات بنجاح',
    },
    common: {
      success: 'تمت العملية بنجاح',
      error: 'حدث خطأ',
      notFound: 'المورد غير موجود',
      badRequest: 'طلب غير صالح',
      serverError: 'خطأ داخلي في الخادم',
      validationError: 'خطأ في التحقق',
      unauthorized: 'وصول غير مصرح',
      forbidden: 'الوصول ممنوع',
      tooManyRequests: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.',
    },
  },
  // Urdu (RTL) translations
  ur: {
    auth: {
      loginSuccess: 'لاگ ان کامیاب',
      loginFailed: 'غلط ای میل یا پاس ورڈ',
      registerSuccess: 'رجسٹریشن کامیاب۔ براہ کرم اپنا ای میل تصدیق کریں۔',
      logoutSuccess: 'لاگ آؤٹ کامیاب',
      tokenExpired: 'سیشن ختم ہو گیا۔ براہ کرم دوبارہ لاگ ان کریں۔',
      tokenInvalid: 'غلط تصدیقی ٹوکن',
      tokenRefreshed: 'ٹوکن کامیابی سے تجدید ہو گیا',
      emailVerified: 'ای میل کامیابی سے تصدیق ہو گئی',
      emailAlreadyVerified: 'ای میل پہلے سے تصدیق شدہ ہے',
      verificationEmailSent: 'تصدیقی ای میل بھیج دی گئی',
      passwordResetSent: 'پاس ورڈ ری سیٹ کی ہدایات بھیج دی گئیں',
      passwordResetSuccess: 'پاس ورڈ کامیابی سے ری سیٹ ہو گیا',
      invalidResetToken: 'غلط یا ختم شدہ ری سیٹ ٹوکن',
      accountLocked: 'اکاؤنٹ بند ہے۔ براہ کرم سپورٹ سے رابطہ کریں۔',
      accountPending: 'اکاؤنٹ منظوری کے انتظار میں',
      accessDenied: 'رسائی مسترد۔ ناکافی اجازتیں۔',
    },
    user: {
      profileUpdated: 'پروفائل کامیابی سے اپڈیٹ ہو گئی',
      profileFetched: 'پروفائل کامیابی سے حاصل ہو گئی',
      userNotFound: 'صارف نہیں ملا',
      emailExists: 'ای میل پہلے سے رجسٹرڈ ہے',
      phoneExists: 'فون نمبر پہلے سے رجسٹرڈ ہے',
      passwordChanged: 'پاس ورڈ کامیابی سے تبدیل ہو گیا',
      avatarUpdated: 'تصویر کامیابی سے اپڈیٹ ہو گئی',
    },
    document: {
      uploadSuccess: 'دستاویز کامیابی سے اپلوڈ ہو گئی',
      uploadFailed: 'دستاویز اپلوڈ ناکام',
      fetchSuccess: 'دستاویزات کامیابی سے حاصل ہو گئیں',
      deleteSuccess: 'دستاویز کامیابی سے حذف ہو گئی',
      notFound: 'دستاویز نہیں ملی',
      verifySuccess: 'دستاویز کامیابی سے تصدیق ہو گئی',
      rejectSuccess: 'دستاویز مسترد کر دی گئی',
      alreadyExists: 'اس قسم کی دستاویز پہلے سے موجود ہے',
    },
    admin: {
      usersFetched: 'صارفین کامیابی سے حاصل ہو گئے',
      userUpdated: 'صارف کامیابی سے اپڈیٹ ہو گیا',
      userDeleted: 'صارف کامیابی سے حذف ہو گیا',
      documentsFetched: 'دستاویزات کامیابی سے حاصل ہو گئیں',
      statsSuccess: 'اعداد و شمار کامیابی سے حاصل ہو گئے',
    },
    common: {
      success: 'آپریشن کامیاب',
      error: 'ایک خرابی ہوئی',
      notFound: 'ریسورس نہیں ملا',
      badRequest: 'غلط درخواست',
      serverError: 'اندرونی سرور خرابی',
      validationError: 'توثیق کی خرابی',
      unauthorized: 'غیر مجاز رسائی',
      forbidden: 'رسائی ممنوع',
      tooManyRequests: 'بہت زیادہ درخواستیں۔ براہ کرم بعد میں دوبارہ کوشش کریں۔',
    },
  },
};

/**
 * Get translation for a key
 * @param {string} lang - Language code
 * @param {string} category - Category (auth, user, document, admin, common)
 * @param {string} key - Translation key
 * @returns {string} Translated message
 */
export const getTranslation = (lang, category, key) => {
  const language = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  return translations[language]?.[category]?.[key] || translations[DEFAULT_LANGUAGE]?.[category]?.[key] || key;
};

/**
 * Check if a language is RTL
 * @param {string} lang - Language code
 * @returns {boolean}
 */
export const isRTL = (lang) => RTL_LANGUAGES.includes(lang);

/**
 * Localization middleware - Attaches translation helper to request
 * Priority: User profile > Accept-Language header > Query param > Default
 */
export const localizationMiddleware = (req, res, next) => {
  // Priority 1: User's preferred language from profile (set by auth middleware)
  let lang = req.user?.preferredLanguage;
  
  // Priority 2: Accept-Language header
  if (!lang) {
    lang = req.headers['accept-language']?.split(',')[0]?.split('-')[0];
  }
  
  // Priority 3: Query parameter
  if (!lang) {
    lang = req.query.lang;
  }
  
  // Default fallback
  req.lang = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  req.isRTL = isRTL(req.lang);
  
  // Helper function to get translations
  req.t = (category, key) => getTranslation(req.lang, category, key);
  
  // Set Content-Language header for proper RTL support
  res.setHeader('Content-Language', req.lang);
  
  next();
};

export default { 
  localizationMiddleware, 
  getTranslation, 
  isRTL,
  SUPPORTED_LANGUAGES, 
  RTL_LANGUAGES,
  DEFAULT_LANGUAGE 
};
