export function isOnLeave(user) {
  return (
    user.leaveOfAbsence === true ||
    user.leaveOfAbsence === "true" ||
    user.onLeave === true ||
    user.onLeave === "true" ||
    user.customOnLeave === true ||
    user.customOnLeave === "true" ||
    // Also check nested customSecurityAttributes, in case backend ever changes
    (user.customSecurityAttributes &&
      user.customSecurityAttributes.AdditionalProperties &&
      user.customSecurityAttributes.AdditionalProperties.Workday &&
      (
        user.customSecurityAttributes.AdditionalProperties.Workday.onLeave === true ||
        user.customSecurityAttributes.AdditionalProperties.Workday.onLeave === "true"
      )
    )
  );
}