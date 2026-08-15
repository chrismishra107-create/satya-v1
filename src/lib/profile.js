const VALID_CATEGORIES = ["student", "business"];

export function isValidCategory(value) {
  return VALID_CATEGORIES.includes(value);
}

function isMissingProfilesTable(error) {
  const message = (error?.message || String(error)).toLowerCase();
  return (
    message.includes("profiles") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

function isMissingProfileColumn(error, columnName) {
  const message = (error?.message || String(error)).toLowerCase();
  return message.includes(columnName.toLowerCase()) && message.includes("does not exist");
}

async function selectProfile(supabase, userId, columns) {
  return supabase
    .from("profiles")
    .select(columns)
    .eq("id", userId)
    .maybeSingle();
}

function normalizeProfile(data) {
  if (!data) {
    return null;
  }

  return {
    ...data,
    is_admin: Boolean(data.is_admin),
  };
}

async function selectProfileWithAdminFallback(supabase, userId) {
  const preferredResult = await selectProfile(supabase, userId, "id, category, is_admin");

  if (!preferredResult.error) {
    return {
      data: normalizeProfile(preferredResult.data),
      error: null,
    };
  }

  if (!isMissingProfileColumn(preferredResult.error, "is_admin")) {
    return {
      data: null,
      error: preferredResult.error,
    };
  }

  const fallbackResult = await selectProfile(supabase, userId, "id, category");

  return {
    data: fallbackResult.data
      ? normalizeProfile({ ...fallbackResult.data, is_admin: false })
      : null,
    error: fallbackResult.error,
  };
}

async function insertProfileWithAdminFallback(supabase, values) {
  const preferredResult = await supabase
    .from("profiles")
    .insert(values)
    .select("id, category, is_admin")
    .single();

  if (!preferredResult.error) {
    return {
      data: normalizeProfile(preferredResult.data),
      error: null,
    };
  }

  if (!isMissingProfileColumn(preferredResult.error, "is_admin")) {
    return {
      data: null,
      error: preferredResult.error,
    };
  }

  const fallbackResult = await supabase
    .from("profiles")
    .insert(values)
    .select("id, category")
    .single();

  return {
    data: fallbackResult.data
      ? normalizeProfile({ ...fallbackResult.data, is_admin: false })
      : null,
    error: fallbackResult.error,
  };
}

async function upsertProfileWithAdminFallback(supabase, values) {
  const preferredResult = await supabase
    .from("profiles")
    .upsert(values, { onConflict: "id" })
    .select("id, category, is_admin")
    .single();

  if (!preferredResult.error) {
    return {
      data: normalizeProfile(preferredResult.data),
      error: null,
    };
  }

  if (!isMissingProfileColumn(preferredResult.error, "is_admin")) {
    return {
      data: null,
      error: preferredResult.error,
    };
  }

  const fallbackResult = await supabase
    .from("profiles")
    .upsert(values, { onConflict: "id" })
    .select("id, category")
    .single();

  return {
    data: fallbackResult.data
      ? normalizeProfile({ ...fallbackResult.data, is_admin: false })
      : null,
    error: fallbackResult.error,
  };
}

export async function getUserProfile(supabase, userId) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await selectProfileWithAdminFallback(supabase, userId);

  if (error) {
    if (isMissingProfilesTable(error)) {
      const setupError = new Error("PROFILES_TABLE_MISSING");
      setupError.cause = error;
      throw setupError;
    }
    throw new Error(error.message || "Unable to load your profile.");
  }

  if (data) {
    return data;
  }

  const { data: created, error: insertError } = await insertProfileWithAdminFallback(
    supabase,
    { id: userId }
  );

  if (insertError) {
    if (isMissingProfilesTable(insertError)) {
      const setupError = new Error("PROFILES_TABLE_MISSING");
      setupError.cause = insertError;
      throw setupError;
    }
    throw new Error(insertError.message || "Unable to create your profile.");
  }

  return created;
}

export async function setUserCategory(supabase, userId, category) {
  if (!isValidCategory(category)) {
    throw new Error("Please choose Student or Business.");
  }

  const { data, error } = await upsertProfileWithAdminFallback(supabase, {
    id: userId,
    category,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (isMissingProfilesTable(error)) {
      const setupError = new Error("PROFILES_TABLE_MISSING");
      setupError.cause = error;
      throw setupError;
    }
    throw new Error(error.message || "Unable to save your category.");
  }

  return data;
}

export async function resolvePostLoginPath(supabase) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return "/login";
  }

  try {
    const profile = await getUserProfile(supabase, session.user.id);

    if (!profile?.category) {
      return "/onboarding/category";
    }

    return "/";
  } catch (error) {
    if (error instanceof Error && error.message === "PROFILES_TABLE_MISSING") {
      return "/onboarding/category";
    }

    throw error;
  }
}
